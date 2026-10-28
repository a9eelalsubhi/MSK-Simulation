// Lecture 8 relationship maps use source-derived labels. Diagrams are schematic.
export function createLowerMuscleLab({data,select,isQuiz}) {
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const panel=el('section',null,'l8-lab-entry');panel.append(el('h2','See the relationships'));
 const opener=el('button','Open visual lab ↗');panel.append(opener);
 document.getElementById('topics').before(panel);
 const dialog=el('dialog',null,'l8-lab-dialog');const head=el('div',null,'dialog-head');head.append(el('strong','Lecture 8 · visual lab'));
 const close=el('button','×');close.setAttribute('aria-label','Close visual lab');head.append(close);dialog.append(head);
 const tabs=el('nav',null,'l8-tabs');tabs.setAttribute('aria-label','Lecture 8 visual maps');dialog.append(tabs);
 const body=el('div',null,'l8-lab-body');dialog.append(body);document.body.append(dialog);
 const modes={compartments:'Compartment map',triangle:'Femoral triangle',sheath:'Femoral sheath',canal:'Adductor canal',gluteal:'Gluteal layers',retinaculum:'Extensor band',actions:'Action & nerve map',calf:'Superficial calf','deep-calf':'Deep calf',tunnel:'Flexor tunnel',fossa:'Popliteal fossa',dorsum:'Foot dorsum',sole:'Sole · 4 layers'};
 let mode='compartments',current=null;
 const buttons=new Map();
 const card=(title,text,color)=>{const c=el('div',null,'l8-map-card');c.style.setProperty('--l8-accent',color);c.append(el('strong',title),el('p',text));return c;};
 const grid=(items)=>{const g=el('div',null,'l8-map-grid');items.forEach(v=>g.append(card(...v)));body.append(g);};
 const note=t=>body.append(el('p',t,'l8-note'));
 const jump=(topic)=>{const first=data.steps.findIndex(s=>s.topic===topic);if(first<0)return;const b=el('button','Show on 3D model →','l8-jump');b.onclick=()=>{if(isQuiz())return;dialog.close();select(first);};body.append(b);};
 const jumpTitle=(title,label)=>{const index=data.steps.findIndex(s=>s.title===title);if(index<0)return;const b=el('button',label,'l8-jump l8-layer-jump');b.onclick=()=>{if(isQuiz())return;dialog.close();select(index);};body.append(b);};
 function render(){body.replaceChildren(el('h2',modes[mode]));for(const [k,b] of buttons){b.classList.toggle('active',k===mode);b.setAttribute('aria-pressed',String(k===mode));}
  if(mode==='compartments'){
   grid([['THIGH · anterior','Hip flexors and quadriceps.','#57d8ce'],['THIGH · medial','Adductors and gracilis.','#f3bd62'],['THIGH · posterior','Hamstrings.','#ff829e'],['LEG · anterior','Dorsiflexors; deep fibular nerve.','#68d5e5'],['LEG · lateral','Peroneus longus and brevis; superficial fibular nerve.','#edac79'],['LEG · posterior','Superficial calf and deep posterior group; tibial nerve.','#b69cff']]);
   note('Thigh fascia lata thickens laterally as the iliotibial tract. Leg fascia sends two septa to the fibula. The continuation details the posterior leg on printed pages 36–38.');jump('overview');
  }
  if(mode==='triangle'){
   const shape=el('div',null,'l8-triangle');shape.innerHTML='<svg viewBox="0 0 520 310" role="img" aria-label="Schematic femoral triangle boundaries"><path d="M50 55H470L260 275Z" fill="#163b50" stroke="#6ed0d2" stroke-width="5"/><text x="260" y="42">INGUINAL LIGAMENT · BASE</text><text x="91" y="193" transform="rotate(56 91 193)">SARTORIUS</text><text x="385" y="193" transform="rotate(-56 385 193)">ADDUCTOR LONGUS</text><text x="260" y="155">ILIOPSOAS · PECTINEUS</text><text x="260" y="184">ADDUCTOR LONGUS · FLOOR</text></svg>';body.append(shape);
   grid([['Boundaries','Base: inguinal ligament. Lateral: medial border of sartorius. Medial: medial border of adductor longus.','#57d8ce'],['Floor and roof','Floor lateral → medial: iliopsoas, pectineus, adductor longus. Roof: skin and fascia.','#f3bd62'],['Contents','Femoral sheath; femoral nerve, artery and vein; genitofemoral branch; deep inguinal nodes; lateral cutaneous nerve of thigh.','#ff829e']]);
   note('The triangle is an anatomical region between real model structures; its perimeter is a teaching diagram, not a new mesh. PDF page 6.');jump('triangle');
  }
  if(mode==='sheath'){
   grid([['LATERAL','Femoral artery + femoral branch of genitofemoral nerve.','#f25b72'],['INTERMEDIATE','Femoral vein.','#58a9ff'],['MEDIAL · FEMORAL CANAL','Lymph vessels and lymph node. Its upper opening is the femoral ring.','#f3bd62']]);
   note('The femoral ring lies between the femoral vein and lacunar ligament in the lecture. Vessel and nerve meshes are real; compartment borders and lymphatics are schematic. PDF page 7.');jump('sheath');
  }
  if(mode==='canal'){
   const shape=el('div',null,'l8-triangle');shape.innerHTML='<svg viewBox="0 0 520 300" role="img" aria-label="Schematic triangular cross-section of adductor canal"><path d="M260 35L90 260H430Z" fill="#163b50" stroke="#6ed0d2" stroke-width="5"/><text x="260" y="25">SARTORIUS + FASCIA</text><text x="105" y="280">ADDUCTORS</text><text x="407" y="280">VASTUS MEDIALIS</text><circle cx="225" cy="173" r="16" fill="#f25b72"/><circle cx="265" cy="173" r="16" fill="#58a9ff"/><circle cx="305" cy="173" r="11" fill="#f3bd62"/></svg>';body.append(shape);
   grid([['Course','Medial middle third of thigh beneath sartorius: femoral triangle apex → opening in adductor magnus.','#57d8ce'],['Three walls','Anteromedial: sartorius + fascia. Posterior: adductor longus/magnus. Lateral: vastus medialis.','#f3bd62'],['Contents','Femoral artery/vein, saphenous nerve, nerve to vastus medialis, terminal obturator nerve, deep lymph vessels.','#ff829e']]);
   note('Cross-section is simplified from the supplied PDF page 8, with colored vessel/nerve dots only as orientation aids.');jump('canal');
  }
  if(mode==='gluteal'){
   grid([['OUTER · gluteus maximus','Posterior ilium → iliotibial tract and gluteal tuberosity. Inferior gluteal nerve.','#ff829e'],['MIDDLE · gluteus medius','Between posterior/anterior gluteal lines → lateral greater trochanter. Superior gluteal nerve.','#57d8ce'],['DEEP · gluteus minimus','Between anterior/inferior gluteal lines → anterior greater trochanter. Superior gluteal nerve.','#f3bd62'],['DEEP ROTATORS','Piriformis, superior/inferior gemelli, obturator internus and quadratus femoris laterally rotate the thigh.','#b69cff']]);
   note('Use the numbered markers on the 3D step to hide overlying muscles and reveal the next layer. PDF pages 10–12.');jump('gluteal');
  }
  if(mode==='retinaculum'){
   grid([['T · Tom','Tibialis anterior','#68d5e5'],['H · Has','Extensor hallucis longus','#57d8ce'],['V · Very','Anterior tibial vessels','#f25b72'],['N · Nice','Anterior tibial / deep fibular nerve','#f3bd62'],['D · Dogs','Extensor digitorum longus','#58a9ff'],['P · Pigs','Peroneus tertius','#edac79']]);
   note('Order of structures deep to the superior extensor retinaculum in PDF page 16. The actual fascial band is on the 3D model.');jump('retinaculum');
  }
  if(mode==='actions'){
   grid([['FEMORAL','Anterior thigh: hip flexors and quadriceps; note psoas major has ventral rami L1–L3.','#57d8ce'],['OBTURATOR','Medial adductors; pectineus also lists femoral supply.','#f3bd62'],['SCIATIC · TIBIAL PART','Most listed hamstrings, plus hamstring part of adductor magnus.','#ff829e'],['SCIATIC · COMMON PERONEAL PART','Short head of biceps femoris.','#b69cff'],['DEEP FIBULAR','Anterior leg: dorsiflexion and toe extension.','#68d5e5'],['SUPERFICIAL FIBULAR','Lateral leg: plantarflexion and eversion in this lecture.','#edac79']]);
   note('This groups only the nerve/action relationships stated on the supplied slides. Choose a muscle on the tour for its precise O/I/N/A.');jump('anterior-leg');
  }
  if(mode==='calf'){
   grid([['PLANTARIS','Femur above lateral condyle → calcaneus. Plantarflexes foot and flexes knee.','#f3bd62'],['GASTROCNEMIUS','Medial and lateral femoral heads → calcaneus by tendo-calcaneus. Plantarflexes foot and flexes knee.','#ff829e'],['SOLEUS','Upper fibula, tibial soleal line and arch → calcaneus by tendo-calcaneus. Plantarflexes foot.','#57d8ce']]);
   note('All three superficial muscles are supplied by the tibial nerve. Rotate the actual 3D calf to compare the two gastrocnemius heads with the deeper soleus. Continuation PDF page 1 (printed 36).');jump('posterior-superficial');
  }
  if(mode==='deep-calf'){
   grid([['POPLITEUS','Lateral femoral condyle → posterior tibia above soleal line. Unlocks the knee.','#b69cff'],['TIBIALIS POSTERIOR','Posterior tibia and fibula → navicular, medial cuneiform and other listed tarsal/metatarsal sites. Plantarflexion + inversion.','#ff829e'],['FLEXOR DIGITORUM LONGUS','Posterior tibia → distal phalanges of lateral four toes. Flexes those toes; plantarflexion + inversion.','#57d8ce'],['FLEXOR HALLUCIS LONGUS','Fibula → distal phalanx of big toe. Flexes big toe; plantarflexion + inversion.','#f3bd62']]);
   note('All four are supplied by the tibial nerve. The diagram page shows the long flexor paths continuing around the ankle into the foot. Continuation pages 2–3 (printed 37–38).');jump('posterior-deep');
  }
  if(mode==='tunnel'){
   const shape=el('div',null,'l8-order-strip');shape.setAttribute('role','img');shape.setAttribute('aria-label','Lecture order deep to flexor retinaculum: tibialis posterior, flexor digitorum longus, posterior tibial vessels, tibial nerve, flexor hallucis longus');
   for(const [letter,label,color] of [['T','Tibialis posterior','#57d8ce'],['D','Flexor digitorum longus','#f3bd62'],['V','Posterior tibial vessels','#f25b72'],['N','Tibial nerve','#b69cff'],['H','Flexor hallucis longus','#ff829e']]){const cell=el('div',null,'l8-order-cell');cell.style.setProperty('--l8-accent',color);cell.append(el('strong',letter),el('span',label));shape.append(cell);}body.append(shape);
   grid([['BONY ANCHORS','The flexor retinaculum runs between the medial malleolus and calcaneus.','#57d8ce'],['REMEMBER THE ORDER','Tom Does Very Nice Hats = the five listed structures deep to the band.','#f3bd62']]);
   note('This order strip is a schematic from continuation page 4 (printed 39). The ankle band, muscles, vessels, nerve and bones use actual meshes in the tour.');jump('flexor-retinaculum');
  }
  if(mode==='fossa'){
   const shape=el('div',null,'l8-triangle');shape.innerHTML='<svg viewBox="0 0 520 310" role="img" aria-label="Schematic diamond of popliteal fossa muscle boundaries"><path d="M260 24L465 150L260 284L55 150Z" fill="#163b50" stroke="#75d3d3" stroke-width="5"/><text x="120" y="72">SEMITENDINOSUS</text><text x="394" y="72">BICEPS FEMORIS</text><text x="130" y="269">MEDIAL GASTROC</text><text x="396" y="269">LATERAL GASTROC</text><text x="260" y="151">VESSELS · NERVES</text><text x="260" y="179">FAT · NODES</text></svg>';body.append(shape);
   grid([['UPPER BORDERS','Lateral: biceps femoris. Medial: semimembranosus and semitendinosus.','#57d8ce'],['LOWER BORDERS','Lateral: gastrocnemius lateral head and plantaris. Medial: gastrocnemius medial head.','#ff829e'],['FLOOR / ROOF','Floor: popliteal femur, back of knee, popliteus. Roof: skin/fascia, posterior cutaneous and sural nerves, small saphenous vein.','#f3bd62'],['CONTENTS','Popliteal vessels, lymph nodes, fat, tibial nerve, common fibular nerve.','#b69cff']]);
   note('The diamond outline is schematic; muscle, vessel and nerve paths are actual model structures. Fat, lymph nodes and fascia are read from continuation page 5 (printed 40).');jump('popliteal-fossa');
  }
  if(mode==='dorsum'){
   grid([['EXTENSOR DIGITORUM BREVIS','Calcaneus → long extensor tendons of medial four toes. Helps extend those toes.','#57d8ce'],['EXTENSOR HALLUCIS BREVIS','Calcaneus → proximal phalanx of big toe. Helps extend big toe.','#f3bd62'],['SHARED NERVE','Deep peroneal (fibular) nerve supplies both.','#b69cff']]);
   note('Use the superior view to separate the two short muscle meshes on the foot dorsum. Continuation page 6 (printed 41).');jump('dorsum-foot');
  }
  if(mode==='sole'){
   grid([['LAYER 1 · SUPERFICIAL','Abductor hallucis, flexor digitorum brevis, abductor digiti minimi.','#f3bd62'],['LAYER 2','Quadratus plantae and lumbricals.','#b69cff'],['LAYER 3','Flexor hallucis brevis, adductor hallucis, flexor digiti minimi brevis.','#ff829e'],['LAYER 4 · DEEPEST','Plantar interossei adduct; dorsal interossei abduct digits 2–4.','#57d8ce']]);
   note('The lecture names ten muscle groups in four layers. Lateral plantar nerve supplies them except abductor hallucis, flexor digitorum brevis, flexor hallucis brevis and first lumbrical (medial plantar nerve). Origins and insertions for these sole groups are not supplied. Continuation pages 7–8 (printed 42–43).');
   for(const [title,label] of [['Sole · layer 1 · superficial trio','Reveal layer 1 →'],['Sole · layer 2 · quadratus and lumbricals','Reveal layer 2 →'],['Sole · layer 3 · short toe muscles','Reveal layer 3 →'],['Sole · layer 4 · interossei','Reveal layer 4 →']])jumpTitle(title,label);
  }
 }
 for(const [k,label] of Object.entries(modes)){const b=el('button',label);b.onclick=()=>{mode=k;render();};buttons.set(k,b);tabs.append(b);}
 opener.onclick=()=>{if(isQuiz())return;mode=current?.lab||'compartments';render();dialog.showModal();};close.onclick=()=>dialog.close();
 return {update(step){current=step;opener.textContent=step.lab?'Open '+modes[step.lab]+' ↗':'Open visual lab ↗';},dispose(){dialog.remove();panel.remove();}};
}
