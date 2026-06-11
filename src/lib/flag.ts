// Map a nationality (country name, as in the dataset) to a flag emoji.
// Names with no mapping fall back to a neutral football emoji.
const FLAGS: Record<string, string> = {
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Northern Ireland': '🇬🇧', Ireland: '🇮🇪', France: '🇫🇷', Spain: '🇪🇸',
  Germany: '🇩🇪', Italy: '🇮🇹', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Brazil: '🇧🇷', Argentina: '🇦🇷', Croatia: '🇭🇷',
  Serbia: '🇷🇸', Norway: '🇳🇴', Sweden: '🇸🇪', Denmark: '🇩🇰',
  Turkey: '🇹🇷', Türkiye: '🇹🇷', Japan: '🇯🇵', 'South Korea': '🇰🇷',
  'Korea, South': '🇰🇷', Morocco: '🇲🇦', Senegal: '🇸🇳', Nigeria: '🇳🇬',
  'United States': '🇺🇸', USA: '🇺🇸', Mexico: '🇲🇽', Colombia: '🇨🇴',
  Uruguay: '🇺🇾', Chile: '🇨🇱', Poland: '🇵🇱', Ukraine: '🇺🇦',
  Russia: '🇷🇺', Greece: '🇬🇷', Switzerland: '🇨🇭', Austria: '🇦🇹',
  'Czech Republic': '🇨🇿', Czechia: '🇨🇿', Romania: '🇷🇴', Hungary: '🇭🇺',
  Slovakia: '🇸🇰', Slovenia: '🇸🇮', Ghana: '🇬🇭', "Cote d'Ivoire": '🇨🇮',
  'Ivory Coast': '🇨🇮', Cameroon: '🇨🇲', Algeria: '🇩🇿', Egypt: '🇪🇬',
  Australia: '🇦🇺', Canada: '🇨🇦', 'Saudi Arabia': '🇸🇦', Finland: '🇫🇮',
  Iceland: '🇮🇸', Albania: '🇦🇱', 'Bosnia-Herzegovina': '🇧🇦', 'North Macedonia': '🇲🇰',
  Montenegro: '🇲🇪', Georgia: '🇬🇪', Armenia: '🇦🇲', Israel: '🇮🇱',
  Paraguay: '🇵🇾', Peru: '🇵🇪', Ecuador: '🇪🇨', Venezuela: '🇻🇪',
  'DR Congo': '🇨🇩', Mali: '🇲🇱', Tunisia: '🇹🇳', Jamaica: '🇯🇲',
};

export function flagFor(nat: string): string {
  return FLAGS[nat] ?? '⚽';
}
