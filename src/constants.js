export const STORAGE_KEY = "calendario-macro-social-media-v1";
export const LIBRARY_KEY = "calendario-macro-library-v1";

export const FORMATS = [
  "Reels / Shorts",
  "Carrossel",
  "Post estático",
  "Stories",
  "Live",
  "Texto / Thread",
  "Outro",
];

export const STATUSES = ["Brifado", "Programado", "Postado", "Cancelado"];

export const MESES = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

export const DIAS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

export const SEASONAL_DATES = [
  "Ano Novo",
  "Volta às aulas",
  "Carnaval",
  "Páscoa",
  "Dia da Mulher",
  "Dia das Mães",
  "Dia dos Namorados",
  "Festa Junina",
  "Dia dos Pais",
  "Dia do Cliente",
  "Dia das Crianças",
  "Halloween",
  "Black Friday",
  "Cyber Monday",
  "Natal",
  "Réveillon",
  "Verão",
  "Outono",
  "Inverno",
  "Primavera",
];

export const DATE_KINDS = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "sazonal", label: "Sazonal" },
];

export const STATUS_META = {
  Brifado: { label: "Brifado", className: "bg-white/10 text-zinc-200 border-white/15" },
  Programado: { label: "Programado", className: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
  Postado: { label: "Postado", className: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
  Cancelado: { label: "Cancelado", className: "bg-rose-400/15 text-rose-300 border-rose-400/30" },
};

export const FORMAT_SHORT = {
  "Reels / Shorts": "Reels",
  "Post estático": "Estático",
  "Texto / Thread": "Texto",
};
