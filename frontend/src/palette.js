// Semantic category -> Tailwind classes + label. Keep in sync with the
// backend's CATEGORY_COLORS.
export const CATEGORY_STYLE = {
  location: {
    label: 'Location',
    pill: 'text-blue-300 hover:bg-blue-500/15',
    dot: 'bg-blue-400',
    text: 'text-blue-300',
  },
  medical: {
    label: 'Medical',
    pill: 'text-emerald-300 hover:bg-emerald-500/15',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
  },
  intent: {
    label: 'Action / Intent',
    pill: 'text-violet-300 hover:bg-violet-500/15',
    dot: 'bg-violet-400',
    text: 'text-violet-300',
  },
  vehicle: {
    label: 'Vehicle / Suspect',
    pill: 'text-amber-300 hover:bg-amber-500/15',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
  },
};

export const CATEGORY_ORDER = ['location', 'medical', 'intent', 'vehicle'];

// Extra decoration applied on top of the category color for AAVE / dialect
// markers so they read as "flagged for interpretation".
export const AAVE_DECORATION =
  'underline decoration-dotted decoration-2 underline-offset-[3px]';
