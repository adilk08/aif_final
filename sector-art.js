// Both modes use the same physical materials and the same scale-independent map symbols.
const images = new Map();
function picture(name) {
  if (!images.has(name)) {
    const img = new Image();
    img.src = 'assets/sector/' + name + '.webp';
    images.set(name, img);
  }
  const img = images.get(name);
  return img.complete && img.naturalWidth ? img : null;
}

export function paintTerrain(ctx, col, row, size, surface, district, drained = false) {
  const x = col * size, y = row * size;
  const variation = (col * 7 + row * 13) % 11;
  let material = 'concrete';
  if (!surface) material = variation === 2 ? 'pipe' : 'brick';
  else if (district === 'archive') material = drained ? 'mud' : surface > 1 ? 'water' : 'concrete';
  else if (surface === 5) material = 'grate';
  else if (surface === 3) material = 'rubble';
  else if (variation < 3) material = 'plate';
  const img = picture('tile-' + material);
  if (img) ctx.drawImage(img, x, y, size, size);
  else {
    ctx.fillStyle = surface ? '#536067' : '#152027';
    ctx.fillRect(x, y, size, size);
  }
  ctx.fillStyle = !surface ? 'rgba(3,8,13,.69)' : variation % 2 ? 'rgba(8,17,24,.18)' : 'rgba(8,17,24,.08)';
  ctx.fillRect(x, y, size, size);
}

const enemies = ['sentinel', 'berserker', 'technician'];
export function paintUnit(ctx, x, y, type, size, variant) {
  let unit = type;
  if (type === 'enemy') unit = enemies[variant] || enemies[0];
  else if (!['hero','boss','cache','trap'].includes(type)) unit = 'terminal';
  const img = picture('unit-' + unit);
  if (!img) return false;
  ctx.drawImage(img, x - size / 2, y - size * .56, size, size);
  return true;
}
