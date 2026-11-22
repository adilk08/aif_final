// Each path follows the centreline of a bent tube in a 40 × 64 letter cell.
const tubes = {
  З:'M5 12 Q5 6 12 6 H27 Q35 6 35 15 V20 Q35 31 24 31 H15 M25 31 Q36 31 36 43 V48 Q36 58 26 58 H12 Q5 58 5 52',
  А:'M3 58 L17 9 Q20 1 23 9 L37 58 M10 39 H30',
  Б:'M35 6 H7 V57 H25 Q36 57 36 46 V40 Q36 30 26 30 H9',
  Ы:'M4 6 V57 H16 Q25 57 25 47 V42 Q25 32 16 32 H5 M36 6 V57',
  Т:'M2 6 H38 M20 8 V58',
  Й:'M5 6 V57 L35 7 V58 M12 -5 Q20 3 28 -5',
  К:'M6 6 V58 M35 6 L10 31 L36 58',
  О:'M20 6 H22 Q35 6 35 19 V44 Q35 58 22 58 H18 Q5 58 5 45 V20 Q5 6 18 6',
  М:'M4 58 V7 L20 34 L36 7 V58',
  П:'M6 58 V6 H34 V58',
  Л:'M2 58 Q9 58 11 45 L15 6 H34 V58',
  Е:'M34 6 H6 V58 H35 M8 31 H30',
  С:'M35 15 Q33 6 24 6 H18 Q5 6 5 20 V45 Q5 58 18 58 H24 Q33 58 35 49'
};
class NeonSign extends HTMLElement {
  connectedCallback(){
    this.replaceChildren();
    for(const [word,light,core] of [['ЗАБЫТЫЙ','#a2d4f5','#fcfeff'],['КОМПЛЕКС','#ff6521','#ffe5ac']]){
      const canvas=document.createElement('canvas');
      const width=396, height=84;
      canvas.width=width*3;canvas.height=height*3;
      canvas.setAttribute('aria-hidden','true');
      const ctx=canvas.getContext('2d');
      ctx.scale(3,3);
      ctx.lineCap='round';ctx.lineJoin='round';
      const step=(width-35)/word.length;
      [...word].forEach((letter,i)=>{
        ctx.save();
        ctx.translate(17+i*step,13);
        ctx.scale(step/48,1);
        const path=new Path2D(tubes[letter]);
        ctx.lineWidth=8;ctx.strokeStyle='#212329';ctx.stroke(path);
        ctx.shadowColor=light;ctx.shadowBlur=17;
        ctx.lineWidth=6.8;ctx.strokeStyle=light;ctx.stroke(path);
        ctx.shadowBlur=0;ctx.lineWidth=3.8;ctx.strokeStyle=core;ctx.stroke(path);
        ctx.restore();
      });
      this.append(canvas);
    }
  }
}
customElements.define('neon-sign',NeonSign);
