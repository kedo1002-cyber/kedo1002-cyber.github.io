/* ═══════════════════════════════════════════════
   KEDO BRAIN v2 — reflection.js
   Motor de reflexión con análisis multicapa
   Base de datos de frases + algoritmo de decisión
   ═══════════════════════════════════════════════ */

import { AREAS, getArea } from './state.js';

/* ════════════════════════════════════════════════
   BASE DE DATOS DE FRASES
   Organizada por: bloque → arco → posición narrativa
   Arcos: A=alto/positivo B=alto/bajo C=bajo/positivo D=bajo/bajo
   ════════════════════════════════════════════════ */
const DB = {

  /* ── APERTURAS ── calibradas a mood exacto */
  apertura: {
    great: [
      'Hoy funcionaste bien.',
      'Fue un día con energía real.',
      'Le pusiste intensidad hoy.',
      'Buen día, sin dudas.',
      'Hoy cerraste fuerte.',
      'Dia de los que suman.',
    ],
    good: [
      'Avanzaste hoy.',
      'Fue un día que vale.',
      'Hoy sumaste, sin exagerar.',
      'Un día sólido, sin necesitar más.',
      'Bien. Simple y real.',
    ],
    meh: [
      'Regular — y aun así seguiste.',
      'No todo fluyó, pero algo quedó hecho.',
      'Días intermedios también son días.',
      'No fue el mejor día, pero tampoco lo abandonaste.',
      'A veces el día simplemente pesa. Este fue uno de esos.',
    ],
    low: [
      'Un día difícil. Igual estás acá.',
      'Los días bajos también son parte del proceso.',
      'Hoy pesó. Eso también cuenta.',
      'No tienes que fingir que fue bien.',
      'Algunos días el cuerpo y la mente simplemente no dan más — y eso es válido.',
    ],
    hard: [
      'Día exigente. Le pusiste el pecho.',
      'Fue duro, y lo sostuviste.',
      'Los días así son los que forjan el ritmo real.',
      'Aguantaste. No es poco.',
      'Hoy demandó más de lo que había — y lo diste igual.',
    ],
  },

  /* ── LOGRO ── contextualizado por rendimiento real */
  logro: {
    perfecto: [
      '{done}/{total} tareas completadas. Día limpio.',
      'Todas las tareas cerradas. Eso es momentum real.',
      '{done} de {done} — sin pendientes. Difícil de superar.',
    ],
    alto: [
      '{done} de {total} tareas. Completaste {pct}% — incluyendo {tarea1}.',
      'Cerraste {done} de {total}. Entre ellas, {tarea1}.',
      '{pct}% completado hoy. {tarea1} ya es historia.',
    ],
    medio: [
      'De {total} tareas, cerraste {done} — entre ellas {tarea1}.',
      '{done} completadas, {pend} pendientes. La mitad del camino es camino.',
      'Avanzaste en {tarea1}. El resto tiene mañana.',
    ],
    bajo: [
      '{done} tarea{s} cerrada{s} hoy. Menos de lo esperado, pero algo.',
      'Hoy el ritmo no acompañó. Aun así, {tarea1} está hecha.',
      'Rendimiento bajo hoy. Pasa. Mañana reencuadras.',
    ],
    cero: [
      'No había tareas registradas para hoy.',
      'Sin tareas en el sistema. Puede haber sido un día libre.',
      'Hoy no hubo tareas — o no las registraste.',
    ],
    sinCompletadas: [
      'Ninguna tarea completada hoy. Mañana reencuadras desde cero.',
      'El día terminó sin completar tareas. Eso también dice algo — ¿qué pasó?',
      'Cero completadas. No es el fin del mundo, pero vale revisarlo.',
    ],
  },

  /* ── ÁREA DOMINANTE ── reconoce el foco del día */
  area: {
    presente: [
      'Tu energía principal fue hacia {area}.',
      'Hoy el foco estuvo en {area}.',
      '{area} fue donde más pusiste la atención.',
      'El día tuvo cara de {area}.',
    ],
    multiple: [
      'Distribuiste esfuerzo entre {area1} y {area2}.',
      'Día con foco dividido — {area1} y {area2} llevaron el peso.',
    ],
  },

  /* ── HÁBITOS ── refuerzo neurológico */
  habitos: {
    todos: [
      'Todos los hábitos completados — la racha sigue viva.',
      '{nhab} hábito{s} marcados. El sistema neuronal hace su trabajo.',
      'Hábitos al 100%. Eso es acumulación real.',
    ],
    algunos: [
      '{nh_done} de {nh_total} hábitos completados hoy.',
      'Parcial en hábitos — {nh_done}/{nh_total}. Mañana puedes cerrar el ciclo.',
    ],
    ninguno: [
      'Los hábitos quedaron sin marcar hoy.',
      'Sin hábitos completados hoy — ¿qué los bloqueó?',
    ],
    racha: [
      '{streak} días consecutivos en {nombre}. La racha tiene inercia propia.',
      '{streak} días seguidos. El cerebro ya lo empieza a esperar.',
      'Llevas {streak} días con {nombre}. A estas alturas, es parte de ti.',
    ],
  },

  /* ── PENDIENTES ── sin culpa, orientados a mañana */
  pendientes: {
    uno: [
      'Queda pendiente "{tarea}" — lo retomás mañana sin drama.',
      '"{tarea}" sigue en la lista. Mañana es el momento.',
    ],
    varios: [
      'Quedan {n} tareas para mañana. Empezás desde ahí, sin cargar culpa.',
      '{n} pendientes. No son fracasos — son el punto de partida de mañana.',
      'Mañana arrancas con {n} tareas ya conocidas. Ventaja real.',
    ],
  },

  /* ── INSIGHT DEL JOURNAL ── extraído del texto libre */
  insight: {
    cargado: [
      'Lo que escribiste muestra algo de peso — procesarlo en palabras ya es un paso.',
      'El journal refleja un día con tensión. Nombrarlo es la mitad del trabajo.',
      'Parece que hoy hubo carga emocional real. Escribirlo vale más de lo que parece.',
    ],
    fluido: [
      'Tu journal suena a día con flujo. Eso no es menor.',
      'Lo que escribiste tiene energía positiva. Apunta a lo que funcionó.',
      'Día con movimiento real, según tus palabras.',
    ],
    reflexivo: [
      'Escribiste con reflexión hoy. Eso es consciencia activa del proceso.',
      'El journal muestra que estás analizando tu día — no solo viviéndolo.',
    ],
    neutro: [
      'Dejaste registro escrito hoy. Ya es más de lo que hace la mayoría.',
      'Escribiste. Eso cierra el ciclo correctamente.',
    ],
  },

  /* ── CIERRES ── anclan al descanso o a mañana */
  cierre: {
    descanso: [
      'Cerrá el día. El descanso no es pérdida de tiempo — es recuperación activa.',
      'Descansá bien. El cerebro consolida mientras dormís.',
      'A dormir. El cortisol baja, la memoria se organiza.',
      'El sueño es parte del sistema. Respétalo.',
      'Apagá el día conscientemente. Mañana hay más.',
    ],
    manana: [
      'Mañana empieza a construirse desde ahora. Dormís, y el sistema sigue.',
      'Lo que dejaste pendiente tiene lugar mañana. Confiá en el proceso.',
      'Mañana es otra oportunidad real. No hipotética — real.',
      'El día de mañana ya está parcialmente armado. Dormí tranquilo.',
    ],
    racha: [
      'La racha que llevas es evidencia — no motivación. Hay diferencia.',
      'Los días se acumulan. No hace falta el día perfecto, hace falta el día siguiente.',
      'Consistencia sobre intensidad. Siempre.',
    ],
  },
};

/* ════════════════════════════════════════════════
   CAPA 1 — ANÁLISIS SEMÁNTICO
   ════════════════════════════════════════════════ */
function analizarDia(ctx) {
  const { moodId, pct, todayDone, todayTotal, doneTitles, pendingTitles, journalText, habitsData } = ctx;

  /* Score de rendimiento */
  const rendimiento = todayTotal === 0 ? 'sin_tareas'
    : pct === 100 ? 'perfecto'
    : pct >= 75   ? 'alto'
    : pct >= 40   ? 'medio'
    : todayDone > 0 ? 'bajo'
    : 'cero';

  /* Perfil emocional */
  const moodScore = { great:5, good:4, meh:3, low:2, hard:2 }[moodId] || 3;
  const rendScore = { perfecto:5, alto:4, medio:3, bajo:2, cero:1, sin_tareas:3 }[rendimiento];
  const coherencia = Math.abs(moodScore - rendScore);

  /* Análisis de journal */
  let tono_journal = 'neutro';
  if (journalText && journalText.length > 20) {
    const palabrasCarga  = ['difícil','pesado','cansado','frustrado','mal','agotado','no pude','fallé','estrés','preocup','miedo','angustia'];
    const palabrasFlujo  = ['bien','fluido','logré','avancé','contento','feliz','satisfecho','disfruté','fácil','motivado'];
    const palabrasReflex = ['creo','pienso','me doy cuenta','aprendí','entendí','reflexion','noto que','me pregunto'];
    const txt = journalText.toLowerCase();
    const hitsCarga  = palabrasCarga.filter(p => txt.includes(p)).length;
    const hitsFlujo  = palabrasFlujo.filter(p => txt.includes(p)).length;
    const hitsReflex = palabrasReflex.filter(p => txt.includes(p)).length;
    if (hitsReflex >= 2) tono_journal = 'reflexivo';
    else if (hitsCarga > hitsFlujo) tono_journal = 'cargado';
    else if (hitsFlujo > hitsCarga) tono_journal = 'fluido';
  }

  /* Área dominante */
  let areaDominante = null;
  let areaSecundaria = null;
  if (ctx.tasksByArea && Object.keys(ctx.tasksByArea).length) {
    const sorted = Object.entries(ctx.tasksByArea).sort((a,b) => b[1] - a[1]);
    areaDominante  = sorted[0]?.[0] || null;
    areaSecundaria = sorted[1]?.[0] || null;
  }

  /* Hábitos */
  const nhTotal = habitsData?.total || 0;
  const nhDone  = habitsData?.done  || 0;
  const mejorRacha = habitsData?.mejorRacha || null;

  return { rendimiento, moodScore, rendScore, coherencia, tono_journal, areaDominante, areaSecundaria, nhTotal, nhDone, mejorRacha };
}

/* ════════════════════════════════════════════════
   CAPA 2 — MOTOR DE DECISIÓN NARRATIVA
   4 arcos determinísticos (no aleatorios)
   ════════════════════════════════════════════════ */
function seleccionarArco(analisis) {
  const { moodScore, rendScore } = analisis;
  const altaProductividad = rendScore >= 3;
  const moodPositivo      = moodScore >= 3;
  if (altaProductividad && moodPositivo)  return 'A';
  if (altaProductividad && !moodPositivo) return 'B';
  if (!altaProductividad && moodPositivo) return 'C';
  return 'D';
}

/* ════════════════════════════════════════════════
   CAPA 3 — GENERADOR DE TEXTO ESTRUCTURADO
   ════════════════════════════════════════════════ */
function pick(arr) {
  if (!arr || arr.length === 0) return '';
  const seed = new Date().getDate() + new Date().getMonth() * 31;
  return arr[seed % arr.length];
}

function pickRnd(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] !== undefined ? vars[key] : '');
}

/* ════════════════════════════════════════════════
   FUNCIÓN PRINCIPAL
   ════════════════════════════════════════════════ */
export function buildReflection(ctx) {
  const {
    moodId, pct, todayDone, todayTotal,
    doneTitles = [], pendingTitles = [],
    journalText = '', habitsData = {},
    tasksByArea = {},
  } = ctx;

  const analisis = analizarDia(ctx);
  const arco     = seleccionarArco(analisis);
  const bloques  = [];

  /* ── BLOQUE 1: APERTURA ── */
  const apertura = pick(DB.apertura[moodId] || DB.apertura.good);
  bloques.push(apertura);

  /* ── BLOQUE 2: LOGRO ── */
  const tarea1 = doneTitles[0] || '';
  const s_done = todayDone !== 1 ? 's' : '';
  let logro = '';

  if (todayTotal === 0) {
    logro = pick(DB.logro.cero);
  } else if (todayDone === 0) {
    logro = pick(DB.logro.sinCompletadas);
  } else if (pct === 100) {
    logro = interpolate(pick(DB.logro.perfecto), { done: todayDone, total: todayTotal });
  } else if (pct >= 75) {
    logro = interpolate(pick(DB.logro.alto), { done: todayDone, total: todayTotal, pct, tarea1 });
  } else if (pct >= 40) {
    logro = interpolate(pick(DB.logro.medio), { done: todayDone, total: todayTotal, pct, tarea1, pend: pendingTitles.length });
  } else {
    logro = interpolate(pick(DB.logro.bajo), { done: todayDone, s: s_done, tarea1 });
  }
  bloques.push(logro);

  /* ── BLOQUE 3: ÁREA DOMINANTE + HÁBITOS ── */
  const areaDom = analisis.areaDominante;
  const areaSec = analisis.areaSecundaria;

  if (areaDom) {
    const areaLabel  = getArea(areaDom)?.label  || areaDom;
    const areaLabel2 = getArea(areaSec)?.label || areaSec;
    if (areaSec) {
      bloques.push(interpolate(pick(DB.area.multiple), { area1: areaLabel, area2: areaLabel2 }));
    } else {
      bloques.push(interpolate(pick(DB.area.presente), { area: areaLabel }));
    }
  }

  /* hábitos */
  const { total: nhTotal = 0, done: nhDone = 0, mejorRacha } = habitsData;
  if (nhTotal > 0) {
    let habFrase = '';
    const s_hab = nhDone !== 1 ? 's' : '';
    if (nhDone === nhTotal) {
      habFrase = interpolate(pick(DB.habitos.todos), { nhab: nhDone, s: s_hab });
    } else if (nhDone > 0) {
      habFrase = interpolate(pick(DB.habitos.algunos), { nh_done: nhDone, nh_total: nhTotal });
    } else {
      habFrase = pick(DB.habitos.ninguno);
    }
    bloques.push(habFrase);

    /* racha destacada */
    if (mejorRacha && mejorRacha.streak >= 3) {
      const rachaFrase = interpolate(pick(DB.habitos.racha), { streak: mejorRacha.streak, nombre: mejorRacha.nombre });
      bloques.push(rachaFrase);
    }
  }

  /* ── BLOQUE 4: INSIGHT DEL JOURNAL ── */
  if (journalText && journalText.length > 15) {
    const tono = analisis.tono_journal;
    const insightFrase = pick(DB.insight[tono] || DB.insight.neutro);
    bloques.push(insightFrase);
  }

  /* ── BLOQUE 5: PENDIENTES ── */
  if (pendingTitles.length === 1) {
    bloques.push(interpolate(pick(DB.pendientes.uno), { tarea: pendingTitles[0] }));
  } else if (pendingTitles.length > 1) {
    bloques.push(interpolate(pick(DB.pendientes.varios), { n: pendingTitles.length }));
  }

  /* ── BLOQUE 6: CIERRE ── calibrado al arco */
  let cierreFrase = '';
  if (arco === 'A') {
    cierreFrase = pickRnd([...DB.cierre.descanso, ...DB.cierre.racha]);
  } else if (arco === 'B') {
    cierreFrase = pick(DB.cierre.descanso);
  } else if (arco === 'C') {
    cierreFrase = pick(DB.cierre.manana);
  } else {
    cierreFrase = pick(DB.cierre.descanso);
  }
  bloques.push(cierreFrase);

  return bloques.filter(Boolean).join(' ');
}

/* ════════════════════════════════════════════════
   DIAGNÓSTICO DE ARCO (para debug / test)
   ════════════════════════════════════════════════ */
export function diagnoseArc(ctx) {
  const analisis = analizarDia(ctx);
  const arco     = seleccionarArco(analisis);
  return { analisis, arco };
}
