/**
 * Google Navigation–style vehicle markers.
 * Colored circle + direction arrow. Clean, minimal, professional.
 */

/**
 * Returns marker HTML for a vehicle.
 * The `.vm-icon` is rotated by heading in the RAF loop.
 */
export function getVehicleMarkerHTML(
  _type: string | undefined,
  color: string,
  _isMoving: boolean,
  online: boolean,
): string {
  const opacity = online ? '1' : '0.5';
  const offlineDot = !online ? `<div class="vm-offline"></div>` : '';

  // Direction arrow sits above the circle; both rotate together inside .vm-icon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 34" width="28" height="34">
    <!-- heading arrow -->
    <path d="M14 0 L19 9 L14 6.5 L9 9 Z" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- vehicle circle -->
    <circle cx="14" cy="21" r="11" fill="${color}" stroke="white" stroke-width="2.5"/>
    <!-- inner dot (depth) -->
    <circle cx="14" cy="21" r="4" fill="rgba(255,255,255,0.35)"/>
  </svg>`;

  return `<div class="vm-wrap" style="opacity:${opacity}">
    <div class="vm-icon" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.32))">
      ${svg}
    </div>
    ${offlineDot}
  </div>`;
}

/** Injects marker CSS once into document head */
export function injectMarkerStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('vm-styles')) return;
  const s = document.createElement('style');
  s.id = 'vm-styles';
  s.textContent = `
    .vm-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: 32px;
      height: 38px;
    }
    .vm-icon {
      will-change: transform;
      transform-origin: 50% 61.8%;
      line-height: 0;
    }
    .vm-offline {
      position: absolute;
      top: 2px;
      right: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid #fff;
      pointer-events: none;
    }
    .vm-tip {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 4px;
      white-space: nowrap;
      background: rgba(255,255,255,0.97);
      color: #0f172a;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.18);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
      z-index: 10;
      font-family: 'IBM Plex Mono', monospace;
    }
  `;
  document.head.appendChild(s);
}
