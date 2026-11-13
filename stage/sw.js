// stage 전용: 캐시하지 않는 서비스워커. 운영 서비스워커가 stage 주소를 가로채지 않게 한다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
