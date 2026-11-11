/**
 * Generador nativo de Códigos QR (ISO/IEC 18004 Byte Mode, Error Correction Level L/M)
 * Produce SVG vectorial para imprenta y PNG de alta resolución mediante Canvas HTML5
 * sin depender de paquetes externos de red.
 */

// Polinomio generador Reed-Solomon en GF(256)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// Configuraciones de versión QR (Nivel L, soporta hasta 106 bytes para URLs de Trace IC)
const VERSION_TABLE: Record<
  number,
  { size: number; dataCodewords: number; ecCodewords: number; align: number[] }
> = {
  3: { size: 29, dataCodewords: 55, ecCodewords: 15, align: [6, 22] },
  4: { size: 33, dataCodewords: 80, ecCodewords: 20, align: [6, 26] },
  5: { size: 37, dataCodewords: 108, ecCodewords: 26, align: [6, 30] },
};

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const ver = bytes.length <= 50 ? 3 : bytes.length <= 75 ? 4 : 5;
  const cfg = VERSION_TABLE[ver];
  const size = cfg.size;

  // 1. Empaquetar bits (Modo Byte = 0100)
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (const b of bytes) pushBits(b, 8);
  pushBits(0, Math.min(4, cfg.dataCodewords * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const dataWords = new Uint8Array(cfg.dataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
    dataWords[i] = byte;
  }
  const padBytes = [0xec, 0x11];
  for (let i = bits.length / 8; i < cfg.dataCodewords; i++) {
    dataWords[i] = padBytes[(i - bits.length / 8) % 2];
  }

  const ecWords = rsEncode(dataWords, cfg.ecCodewords);
  const allWords = new Uint8Array(dataWords.length + ecWords.length);
  allWords.set(dataWords, 0);
  allWords.set(ecWords, dataWords.length);

  // 2. Inicializar matriz y reservar patrones de función
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFinder = (r: number, c: number) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const y = r + dy;
        const x = c + dx;
        if (y < 0 || y >= size || x < 0 || x >= size) continue;
        const inOuter = dy >= 0 && dy <= 6 && (dx === 0 || dx === 6 || dy === 0 || dy === 6);
        const inInner = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
        modules[y][x] = inOuter || inInner;
        isFunction[y][x] = true;
      }
    }
  };

  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // Patrones de sincronización
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = i % 2 === 0;
    isFunction[6][i] = true;
    modules[i][6] = i % 2 === 0;
    isFunction[i][6] = true;
  }

  // Patrón de alineación
  const cAlign = cfg.align[1];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const y = cAlign + dy;
      const x = cAlign + dx;
      modules[y][x] = Math.max(Math.abs( dx), Math.abs(dy)) !== 1;
      isFunction[y][x] = true;
    }
  }

  // Reservar áreas de formato
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
    if (i < 8) {
      isFunction[8][size - 1 - i] = true;
      isFunction[size - 1 - i][8] = true;
    }
  }
  modules[size - 8][8] = true;
  isFunction[size - 8][8] = true;

  // 3. Colocar bits de datos en zigzag
  let bitIdx = 0;
  const totalBits = allWords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && bitIdx < totalBits) {
          const byte = allWords[bitIdx >>> 3];
          const bit = (byte >>> (7 - (bitIdx & 7))) & 1;
          // Aplicar máscara 0: (y + x) % 2 === 0
          const masked = bit ^ ((y + x) % 2 === 0 ? 1 : 0);
          modules[y][x] = masked === 1;
          bitIdx++;
        }
      }
    }
  }

  // 4. Escribir bits de formato (Nivel L = 01, Máscara 0 = 000 -> 0x77c4)
  const formatBits = 0x77c4;
  for (let i = 0; i <= 5; i++) modules[8][i] = ((formatBits >>> i) & 1) === 1;
  modules[8][7] = ((formatBits >>> 6) & 1) === 1;
  modules[8][8] = ((formatBits >>> 7) & 1) === 1;
  modules[7][8] = ((formatBits >>> 8) & 1) === 1;
  for (let i = 9; i < 15; i++) modules[14 - i][8] = ((formatBits >>> i) & 1) === 1;

  for (let i = 0; i < 8; i++) modules[size - 1 - i][8] = ((formatBits >>> i) & 1) === 1;
  for (let i = 8; i < 15; i++) modules[8][size - 15 + i] = ((formatBits >>> i) & 1) === 1;

  return modules;
}

export function renderQrSvg(text: string, darkColor = '#111827', margin = 2): string {
  const matrix = generateQrMatrix(text);
  const n = matrix.length;
  const total = n + margin * 2;
  let paths = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (matrix[y][x]) {
        paths += `M${x + margin},${y + margin}h1v1h-1z `;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#FFFFFF"/><path d="${paths}" fill="${darkColor}"/></svg>`;
}

export function renderQrPngDataUrl(text: string, darkColor = '#111827', pixelSize = 600, margin = 2): string {
  const matrix = generateQrMatrix(text);
  const n = matrix.length;
  const total = n + margin * 2;
  const canvas = document.createElement('canvas');
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  const cell = pixelSize / total;
  ctx.fillStyle = darkColor;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (matrix[y][x]) {
        ctx.fillRect(
          Math.floor((x + margin) * cell),
          Math.floor((y + margin) * cell),
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }
  }
  return canvas.toDataURL('image/png');
}
