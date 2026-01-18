// Auto-extracted from original HTML
import { Admin } from './Admin.js';

const Input = {
    keys: {}, mouse: { x: 0, y: 0, down: false },
    init() {
        window.addEventListener('keydown', e => { if (typeof Admin !== 'undefined' && Admin.captureKey && Admin.captureKey(e)) return;  const k = e.key.toLowerCase(); if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault(); this.keys[k] = true; if(['1','2','3','4','5','6'].includes(e.key)) this.keys[e.key] = true;
            if(e.key === ' ') this.keys[' '] = true; });
        window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; if(['1','2','3','4','5','6'].includes(e.key)) this.keys[e.key] = false; if (e.key === ' ') this.keys[' '] = false; });
        window.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
        window.addEventListener('mousedown', () => this.mouse.down = true); window.addEventListener('mouseup', () => this.mouse.down = false);
        window.addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; }); window.addEventListener('focus', () => { this.keys = {}; });
    }
};

export { Input };
