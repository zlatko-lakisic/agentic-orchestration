import { inject } from '@angular/core';
import { WebAuth } from './web-auth';
function needsBearer(url) {
    try {
        const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
        if (path === '/api/ping' || path.endsWith('/api/ping'))
            return false;
        if (path === '/api/v1/admin/web-auth' || path.endsWith('/api/v1/admin/web-auth')) {
            return false;
        }
        return path.startsWith('/api/');
    }
    catch {
        return url.includes('/api/');
    }
}
/** Attach the assigned ao-web Bearer token to Admin / operator API calls. */
export const webAuthInterceptor = (req, next) => {
    const webAuth = inject(WebAuth);
    const token = webAuth.bearer();
    if (!token || !needsBearer(req.url) || req.headers.has('Authorization')) {
        return next(req);
    }
    return next(req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
    }));
};
