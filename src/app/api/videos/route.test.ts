import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/videos');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

describe('GET /api/videos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return videos with default parameters', async () => {
    const mockMetadata = {
      title: 'Test Video',
      description: 'A test video',
      creatorAddress: '0x123',
      category: 'gaming',
    };

    // Mock GraphQL query
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          transactions: {
            edges: [
              {
                node: {
                  id: 'tx-1',
                  tags: [{ name: 'Title', value: 'Test Video' }],
                  timestamp: 1234567890,
                },
              },
            ],
          },
        },
      }),
    });

    // Mock metadata fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetadata,
    });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.videos).toHaveLength(1);
    expect(data.videos[0].id).toBe('tx-1');
    expect(data.videos[0].title).toBe('Test Video');
    expect(data.total).toBe(1);
  });

  it('should filter by creator address', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { transactions: { edges: [] } },
      }),
    });

    const request = createRequest({ creator: '0xABC' });
    await GET(request);

    // Verify the GraphQL query includes creator filter
    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.query).toContain('Creator');
    expect(body.query).toContain('0xABC');
  });

  it('should filter by category', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { transactions: { edges: [] } },
      }),
    });

    const request = createRequest({ category: 'gaming' });
    await GET(request);

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.query).toContain('Category');
    expect(body.query).toContain('gaming');
  });

  it('should filter by accessType', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { transactions: { edges: [] } },
      }),
    });

    const request = createRequest({ accessType: 'public' });
    await GET(request);

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.query).toContain('AccessType');
    expect(body.query).toContain('public');
  });

  it('should use custom limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { transactions: { edges: [] } },
      }),
    });

    const request = createRequest({ limit: '5' });
    await GET(request);

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.query).toContain('first: 5');
  });

  it('should skip invalid metadata entries', async () => {
    mockFetch
      // GraphQL response with 2 items
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            transactions: {
              edges: [
                { node: { id: 'tx-1', tags: [], timestamp: 1 } },
                { node: { id: 'tx-2', tags: [], timestamp: 2 } },
              ],
            },
          },
        }),
      })
      // First metadata fetch succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'Valid Video' }),
      })
      // Second metadata fetch fails
      .mockResolvedValueOnce({
        ok: false,
      });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.videos).toHaveLength(1);
    expect(data.total).toBe(1);
  });

  it('should return 500 when GraphQL query fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch videos');
  });

  it('should handle empty results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { transactions: { edges: [] } },
      }),
    });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.videos).toHaveLength(0);
    expect(data.total).toBe(0);
  });
});
