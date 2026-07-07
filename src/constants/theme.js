export const C = {
  // Dark navy + single green UI theme from the uploaded reference image
  white:        "#FFFFFF",
  bg:           "#0F2233",
  bg2:          "#122A3B",
  header:       "#0D1F2D",
  nav:          "#0D1F2D",
  card:         "#172E40",
  surface:      "#20394D",
  surfaceSoft:  "rgba(32,57,77,0.55)",

  // Use ONE green across the whole app
  primary:      "#2EB872",
  primaryDark:  "#2EB872",
  primaryLight: "rgba(46,184,114,0.16)",

  accent:       "#2EB872",
  accentDark:   "#2EB872",
  accentLight:  "rgba(46,184,114,0.16)",

  text:         "#F5FAFF",
  textDark:     "#0D1F2D",
  muted:        "rgba(245,250,255,0.72)",
  mutedLight:   "rgba(245,250,255,0.52)",
  border:       "#2A4A60",

  success:      "#2EB872",
  successDark:  "#2EB872",
  successLight: "rgba(46,184,114,0.16)",
  danger:       "#EF6B73",
  dangerDark:   "#FF7B84",
  dangerLight:  "rgba(239,107,115,0.16)",
  warning:      "#D6C86F",
  warningDark:  "#E6D979",
  warningLight: "rgba(214,200,111,0.16)",

  // Keep old variable names, but point every green-style variable to same green
  purple:       "#2EB872",
  purpleLight:  "rgba(46,184,114,0.16)",
  orange:       "#2EB872",
  orangeLight:  "rgba(46,184,114,0.16)",
  teal:         "#2EB872",
  tealLight:    "rgba(46,184,114,0.16)",
};

export const ROLES = [
  { id: "school",     label: "School (Parent)",  short: "School",     icon: "🎒", bg: C.surface, color: C.primary },
  { id: "college",    label: "College (Parent)", short: "College",    icon: "🎓", bg: C.surface, color: C.primary },
  { id: "employee",   label: "Employee",         short: "Employee",   icon: "💼", bg: C.surface, color: C.primary },
  { id: "driver",     label: "Driver",           short: "Driver",     icon: "🚗", bg: C.surface, color: C.primary },
  { id: "admin",      label: "Org Admin",        short: "Admin",      icon: "🏢", bg: C.surface, color: C.primary },
  { id: "superadmin", label: "Super Admin",      short: "SuperAdmin", icon: "⚙️", bg: C.surface, color: C.primary },
];

export const ROLE_MAP = ROLES.reduce((a, r) => { a[r.id] = r; return a; }, {});

export const ORG_TYPES = ["School", "College", "Corporate Office", "Hospital", "Factory", "Other"];
