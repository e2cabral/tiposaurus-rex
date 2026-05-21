declare const __APP_VERSION__: string;

export const APP_VERSION = typeof __APP_VERSION__ === 'undefined' ? '0.0.0-dev' : __APP_VERSION__;
