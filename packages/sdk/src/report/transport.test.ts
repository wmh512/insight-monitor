// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setOptions } from '../config';
import type { ReportData } from '../types';
import { sendReport } from './transport';

const payload: ReportData[] = [
  {
    type: 'error',
    projectId: 'test_project',
    pageUrl: 'http://localhost/',
    timestamp: 1770000000000,
    visitorId: 'visitor-1',
    device: { ua: 'test', screen: '100x100', lang: 'zh-CN', timezone: 'Asia/Shanghai' },
    error: { kind: 'js', message: 'test', stack: '', fingerprint: 'fp-test' },
  },
];

beforeEach(() => {
  setOptions({
    projectId: 'test_project',
    reportUrl: 'http://localhost/api/report',
    token: 'test',
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('report/transport 服务端确认', () => {
  it('fetch 只有 HTTP 成功且 code=0 才确认发送', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0 }) }),
    );
    await expect(sendReport(payload)).resolves.toBe(true);
  });

  it('服务端返回 400 时视为失败，让队列保留数据', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ code: 400 }) }),
    );
    await expect(sendReport(payload)).resolves.toBe(false);
  });

  it('HTTP 200 但业务 code 非 0 时仍视为失败', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 400 }) }),
    );
    await expect(sendReport(payload)).resolves.toBe(false);
  });

  it('sendBeacon 被浏览器接受时不额外发起 fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
    await expect(sendReport(payload)).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
