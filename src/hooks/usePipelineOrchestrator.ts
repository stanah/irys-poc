"use client";

import { useReducer, useRef, useCallback } from 'react';
import { uploadPipelineReducer, initialPipelineState } from '@/lib/pipeline-reducer';
import { useServiceContext } from '@/contexts/ServiceContext';
import type { PipelineState, PipelineStage } from '@/types/pipeline';
import type { AppError } from '@/types/errors';

interface UploadMetadata {
  title: string;
  description: string;
  category: string;
  tags: string[];
  accessType: 'public';
  creatorAddress: string;
}

export const MAX_RETRY_COUNT = 3;

interface RetryContext {
  file: File;
  metadata: UploadMetadata;
  assetId: string;
  tusEndpoint: string;
  playbackId: string;
  failedStage: PipelineStage;
}

interface UsePipelineOrchestratorReturn {
  state: PipelineState;
  startUpload: (file: File, metadata: UploadMetadata) => Promise<string | null>;
  cancelUpload: () => void;
  retryUpload: () => Promise<string | null>;
}

export function usePipelineOrchestrator(): UsePipelineOrchestratorReturn {
  const [state, dispatch] = useReducer(uploadPipelineReducer, initialPipelineState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastContextRef = useRef<RetryContext | null>(null);
  const { livepeer, irys } = useServiceContext();

  // --- Stage executors ---

  const executeFromStoring = useCallback(async (
    ctx: RetryContext,
    signal: AbortSignal,
    readyData: { playbackId: string },
    metadata: UploadMetadata
  ): Promise<string | null> => {
    dispatch({ type: 'STAGE_START', stage: 'storing' });

    // 4a: HLSマニフェストダウンロード
    dispatch({ type: 'PROGRESS_UPDATE', stage: 'storing', progress: 5, message: 'HLSデータをダウンロード中...' });
    const hlsResult = await livepeer.downloadHlsManifest(readyData.playbackId, { signal });
    if (!hlsResult.success) {
      dispatch({ type: 'STAGE_FAILED', error: hlsResult.error });
      lastContextRef.current = { ...ctx, failedStage: 'storing' };
      return null;
    }

    const hlsManifest = hlsResult.data;

    // 4b: HLSセグメントをIrysに個別アップロード
    const allSegments: { quality: string; bandwidth: number; playlist: string; segmentCids: string[] }[] = [];
    let totalSegments = 0;
    for (const rendition of hlsManifest.renditions) {
      totalSegments += rendition.segments.length;
    }

    let completedSegments = 0;
    for (const rendition of hlsManifest.renditions) {
      const segmentCids: string[] = [];

      for (const segment of rendition.segments) {
        if (signal.aborted) {
          dispatch({ type: 'STAGE_FAILED', error: { category: 'irys', code: 'ABORTED', message: '操作がキャンセルされました', retryable: true } });
          lastContextRef.current = { ...ctx, failedStage: 'storing' };
          return null;
        }

        const segmentData = segment.data
          ? btoa(new Uint8Array(segment.data).reduce((data, byte) => data + String.fromCharCode(byte), ''))
          : '';

        const segmentUploadStart = Date.now();
        const segResult = await irys.uploadData(
          segmentData,
          [
            { name: 'AppName', value: 'DecentralizedVideo' },
            { name: 'Content-Type', value: 'application/octet-stream' },
            { name: 'Type', value: 'video-segment' },
            { name: 'Creator', value: metadata.creatorAddress },
          ],
          { signal }
        );

        if (!segResult.success) {
          dispatch({ type: 'STAGE_FAILED', error: segResult.error });
          lastContextRef.current = { ...ctx, failedStage: 'storing' };
          return null;
        }

        const segDuration = Date.now() - segmentUploadStart;
        console.log(
          `[METRIC] event=irys_upload, size_bytes=${new TextEncoder().encode(segmentData).length}, duration_ms=${segDuration}, type=video-segment, timestamp=${new Date().toISOString()}`
        );

        segmentCids.push(segResult.data.id);
        completedSegments++;

        const pct = Math.round((completedSegments / totalSegments) * 75) + 5;
        dispatch({
          type: 'PROGRESS_UPDATE',
          stage: 'storing',
          progress: pct,
          message: `セグメント保存中... ${completedSegments}/${totalSegments}`,
        });
      }

      allSegments.push({
        quality: rendition.quality,
        bandwidth: rendition.bandwidth,
        playlist: rendition.playlist,
        segmentCids,
      });
    }

    // 4c: サムネイル抽出・アップロード
    dispatch({ type: 'PROGRESS_UPDATE', stage: 'storing', progress: 85, message: 'サムネイルをアップロード中...' });
    let thumbnailCid = '';
    try {
      const thumbnailUrl = `https://vod-cdn.lp-playback.studio/raw/jxf4iblf6wlsyor6526t4tcmtmqa/catalyst-vod-com/hls/${readyData.playbackId}/thumbnails/keyframes_0.png`;
      const thumbResponse = await fetch(thumbnailUrl, { signal });
      if (thumbResponse.ok) {
        const blob = await thumbResponse.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        const thumbResult = await irys.uploadData(
          base64,
          [
            { name: 'AppName', value: 'DecentralizedVideo' },
            { name: 'Content-Type', value: 'image/png' },
            { name: 'Type', value: 'video-thumbnail' },
            { name: 'Creator', value: metadata.creatorAddress },
          ],
          { signal }
        );
        if (thumbResult.success) {
          thumbnailCid = thumbResult.data.id;
        }
      }
    } catch {
      // サムネイル取得失敗は致命的でない
    }

    // 4d: HLS duration計算
    const duration = hlsManifest.renditions.length > 0
      ? hlsManifest.renditions[0].segments.reduce((sum, seg) => sum + seg.duration, 0)
      : 0;

    // 4e: メタデータJSON作成・Irysにアップロード
    dispatch({ type: 'PROGRESS_UPDATE', stage: 'storing', progress: 90, message: 'メタデータを保存中...' });

    const metadataObj = {
      creatorAddress: metadata.creatorAddress,
      createdAt: Date.now(),
      title: metadata.title,
      description: metadata.description,
      thumbnailCid,
      duration,
      category: metadata.category,
      tags: metadata.tags,
      transcodeStatus: 'completed',
      hlsManifestCid: '',
      renditions: allSegments.map((r) => ({
        quality: r.quality,
        bandwidth: r.bandwidth,
        segmentsCid: JSON.stringify(r.segmentCids),
        encryptionKeyHash: '',
      })),
      accessType: metadata.accessType,
      accessControlConditions: [],
      revenueSplit: { creator: 85, platform: 10, copyrightHolders: [] },
    };

    const metadataUploadStart = Date.now();
    const metadataResult = await irys.uploadData(
      JSON.stringify(metadataObj),
      [
        { name: 'AppName', value: 'DecentralizedVideo' },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Type', value: 'video-metadata' },
        { name: 'Creator', value: metadata.creatorAddress },
        { name: 'Title', value: metadata.title },
        { name: 'Category', value: metadata.category },
        { name: 'AccessType', value: 'public' },
        ...metadata.tags.map(tag => ({ name: 'Tag', value: tag })),
      ],
      { signal }
    );

    if (!metadataResult.success) {
      dispatch({ type: 'STAGE_FAILED', error: metadataResult.error });
      lastContextRef.current = { ...ctx, failedStage: 'storing' };
      return null;
    }

    const metadataDuration = Date.now() - metadataUploadStart;
    console.log(
      `[METRIC] event=irys_upload, size_bytes=${new TextEncoder().encode(JSON.stringify(metadataObj)).length}, duration_ms=${metadataDuration}, type=video-metadata, timestamp=${new Date().toISOString()}`
    );

    dispatch({ type: 'STAGE_COMPLETE', stage: 'storing' });

    // Pipeline complete
    dispatch({ type: 'STAGE_START', stage: 'completed' });

    return metadataResult.data.id;
  }, [livepeer, irys]);

  const executeFromTranscoding = useCallback(async (
    ctx: RetryContext,
    signal: AbortSignal,
    metadata: UploadMetadata
  ): Promise<string | null> => {
    dispatch({ type: 'STAGE_START', stage: 'transcoding' });
    const transcodeStartTime = Date.now();
    console.log(
      `[METRIC] event=transcode_start, asset_id=${ctx.assetId}, timestamp=${new Date().toISOString()}`
    );

    const readyResult = await livepeer.waitForReady(
      ctx.assetId,
      (status) => {
        const pct = status.progress ? Math.round(status.progress * 100) : 0;
        dispatch({
          type: 'PROGRESS_UPDATE',
          stage: 'transcoding',
          progress: pct,
          message: `トランスコード中... ${pct}%`,
        });
      },
      { signal }
    );

    if (!readyResult.success) {
      const error: AppError = {
        ...readyResult.error,
        message: readyResult.error.code === 'TRANSCODE_FAILED'
          ? 'トランスコードに失敗しました。サポート形式: MP4 (H.264), WebM, MOV'
          : readyResult.error.message,
      };
      dispatch({ type: 'STAGE_FAILED', error });
      lastContextRef.current = { ...ctx, failedStage: 'transcoding' };
      return null;
    }

    const transcodeDuration = Date.now() - transcodeStartTime;
    console.log(
      `[METRIC] event=transcode_complete, asset_id=${ctx.assetId}, duration_ms=${transcodeDuration}, timestamp=${new Date().toISOString()}`
    );
    dispatch({ type: 'STAGE_COMPLETE', stage: 'transcoding' });

    // Update context with playbackId
    const updatedCtx = { ...ctx, playbackId: readyResult.data.playbackId };
    lastContextRef.current = updatedCtx;

    return await executeFromStoring(updatedCtx, signal, { playbackId: readyResult.data.playbackId }, metadata);
  }, [livepeer, executeFromStoring]);

  const executeFromUploading = useCallback(async (
    ctx: RetryContext,
    signal: AbortSignal,
    metadata: UploadMetadata
  ): Promise<string | null> => {
    dispatch({ type: 'STAGE_START', stage: 'uploading' });

    // TUS resumable upload: tus-js-clientはlocalStorageキャッシュで中断地点を記憶し自動再開
    const uploadResult = await livepeer.uploadWithTus(
      ctx.file,
      ctx.tusEndpoint,
      (percentage) => {
        dispatch({
          type: 'PROGRESS_UPDATE',
          stage: 'uploading',
          progress: percentage,
          message: `アップロード中... ${percentage}%`,
        });
      },
      { signal }
    );

    if (!uploadResult.success) {
      dispatch({ type: 'STAGE_FAILED', error: uploadResult.error });
      lastContextRef.current = { ...ctx, failedStage: 'uploading' };
      return null;
    }
    dispatch({ type: 'STAGE_COMPLETE', stage: 'uploading' });

    return await executeFromTranscoding(ctx, signal, metadata);
  }, [livepeer, executeFromTranscoding]);

  const executeFromPreparing = useCallback(async (
    file: File,
    metadata: UploadMetadata,
    signal: AbortSignal
  ): Promise<string | null> => {
    dispatch({ type: 'STAGE_START', stage: 'preparing' });
    const assetResult = await livepeer.createAsset(metadata.title, { signal });
    if (!assetResult.success) {
      dispatch({ type: 'STAGE_FAILED', error: assetResult.error });
      lastContextRef.current = {
        file,
        metadata,
        assetId: '',
        tusEndpoint: '',
        playbackId: '',
        failedStage: 'preparing',
      };
      return null;
    }
    dispatch({ type: 'STAGE_COMPLETE', stage: 'preparing' });

    const ctx: RetryContext = {
      file,
      metadata,
      assetId: assetResult.data.assetId,
      tusEndpoint: assetResult.data.tusEndpoint,
      playbackId: '',
      failedStage: 'preparing',
    };
    lastContextRef.current = ctx;

    return await executeFromUploading(ctx, signal, metadata);
  }, [livepeer, executeFromUploading]);

  // --- Public API ---

  const startUpload = useCallback(async (file: File, metadata: UploadMetadata): Promise<string | null> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    console.log(
      `[METRIC] event=upload_start, file_size_bytes=${file.size}, file_type=${file.type}, timestamp=${new Date().toISOString()}`
    );

    const pipelineStartTime = Date.now();
    const result = await executeFromPreparing(file, metadata, signal);

    if (result) {
      const totalDuration = Date.now() - pipelineStartTime;
      console.log(
        `[METRIC] event=upload_complete, duration_ms=${totalDuration}, video_type=public, metadata_cid=${result}, timestamp=${new Date().toISOString()}`
      );
    }

    return result;
  }, [executeFromPreparing]);

  const cancelUpload = useCallback(async () => {
    abortControllerRef.current?.abort();
    dispatch({ type: 'CANCEL' });

    // AbortSignalにより各サービスのPromiseが解決されるのを待つ
    await new Promise(resolve => setTimeout(resolve, 200));
    dispatch({ type: 'RESET' });
  }, []);

  const retryUpload = useCallback(async (): Promise<string | null> => {
    const ctx = lastContextRef.current;
    if (!ctx || state.stage !== 'failed') return null;

    if (state.retryCount >= MAX_RETRY_COUNT) {
      dispatch({
        type: 'STAGE_FAILED',
        error: {
          category: 'pipeline',
          code: 'MAX_RETRIES_EXCEEDED',
          message: '再試行回数の上限に達しました。最初からやり直してください。',
          retryable: false,
        },
      });
      return null;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    dispatch({ type: 'RETRY_FROM_STAGE', stage: ctx.failedStage });

    console.log(
      `[METRIC] event=pipeline_retry, stage=${ctx.failedStage}, retry_count=${state.retryCount + 1}, timestamp=${new Date().toISOString()}`
    );

    switch (ctx.failedStage) {
      case 'preparing':
        return await executeFromPreparing(ctx.file, ctx.metadata, signal);

      case 'uploading':
        return await executeFromUploading(ctx, signal, ctx.metadata);

      case 'transcoding':
        return await executeFromTranscoding(ctx, signal, ctx.metadata);

      case 'storing':
        return await executeFromStoring(ctx, signal, { playbackId: ctx.playbackId }, ctx.metadata);

      default:
        return null;
    }
  }, [state, executeFromPreparing, executeFromUploading, executeFromTranscoding, executeFromStoring]);

  return { state, startUpload, cancelUpload, retryUpload };
}
