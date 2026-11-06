const JSON_TYPE = 'application/json; charset=utf-8';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': JSON_TYPE } });

export const jsonNoStore = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': JSON_TYPE, 'cache-control': 'no-store' } });
