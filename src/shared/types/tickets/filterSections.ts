export type FilterOption = {
  id: string;
  label: string;
  /** Secondary line, e.g. "12 рейсов от 84 300 ₽". */
  meta?: string;
};

export type FilterSection = {
  id: string;
  title: string;
  options: FilterOption[];
};
