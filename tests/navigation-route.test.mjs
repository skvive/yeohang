import test from 'node:test';
import assert from 'node:assert/strict';
import { routeDetails } from '../lib/navigation-route.ts';

test('Kakao road vertices become safe latitude/longitude map points and guides', () => {
  const normalized = routeDetails({ sections: [{
    roads: [
      { vertexes: [127.118, 37.493, 127.119, 37.494] },
      { vertexes: [127.119, 37.494, 0, 0, 127.120, 37.495] }
    ],
    guides: [{ x: 127.119, y: 37.494, guidance: '우회전', type: 2 },
      { x: 900, y: 30, guidance: 'wrong location' }]
  }] });
  assert.deepEqual(normalized.geometry, [[37.493, 127.118], [37.494, 127.119], [37.495, 127.120]]);
  assert.deepEqual(normalized.guides, [{ lat: 37.494, lng: 127.119, guidance: '우회전', type: 2 }]);
});

test('summary-only or malformed upstream data cannot create a fake route', () => {
  assert.deepEqual(routeDetails({ sections: [{ roads: [{ vertexes: [null, 'broken', 127.1] }] }] }),
    { geometry: [], guides: [] });
  assert.deepEqual(routeDetails({ summary: { distance: 12000 } }), { geometry: [], guides: [] });
});
