(() => {
  const KEY = 'yeohang-user-geo';
  function read() {
    try {
      const v = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (!v || !Number.isFinite(v.lat) || !Number.isFinite(v.lng)) return null;
      return v;
    } catch {
      return null;
    }
  }
  function write(loc) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ lat: loc.lat, lng: loc.lng, ts: Date.now() }));
    } catch {}
  }
  function clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
  }
  function embedPlace(lat, lng, name) {
    const q = `${Number(lat)},${Number(lng)}${name ? ` (${name})` : ''}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&ll=${Number(lat)},${Number(lng)}&z=15&hl=ko&output=embed`;
  }
  function embedDir(origin, dest) {
    return `https://maps.google.com/maps?saddr=${origin.lat},${origin.lng}&daddr=${dest.lat},${dest.lng}&hl=ko&output=embed`;
  }
  function openPlace(lat, lng, name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}${name ? `&query_place=${encodeURIComponent(name)}` : ''}`;
  }
  function openDir(origin, dest, mode) {
    const p = new URLSearchParams({
      api: '1',
      destination: `${dest.lat},${dest.lng}`,
      travelmode: mode || 'walking',
    });
    if (origin) p.set('origin', `${origin.lat},${origin.lng}`);
    return `https://www.google.com/maps/dir/?${p}`;
  }
  function request() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('이 브라우저는 위치 기능을 지원하지 않습니다.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          write(loc);
          resolve(loc);
        },
        (err) => {
          if (err && err.code === 1) reject(new Error('위치 권한이 거부되었습니다. 주소창에서 위치 접근을 허용해 주세요.'));
          else reject(new Error('현재 위치를 가져오지 못했습니다.'));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
      );
    });
  }
  window.YeohangGeo = { read, write, clear, embedPlace, embedDir, openPlace, openDir, request };
})();
