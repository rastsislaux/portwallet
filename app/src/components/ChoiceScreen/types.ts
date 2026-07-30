export type ChoiceOption = {
  id: string;
  /** Primary label — ticker for assets, network name for networks. */
  title: string;
  /** Secondary label — full asset name, chain code, etc. */
  subtitle?: string;
  /** When set, row shows CryptoIcon for this symbol. */
  iconSymbol?: string;
};
