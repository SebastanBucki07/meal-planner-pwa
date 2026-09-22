export function dbKeyToMealType(key: string): string {
  const map: Record<string, string> = {
    'Śniadanie': 'Śniadanie',
    'sniadanie': 'Śniadanie',
    'Drugie Śniadanie': 'II śniadanie',
    'Drugie śniadanie': 'II śniadanie',
    'drugie_sniadanie': 'II śniadanie',
    'Obiad': 'Obiad',
    'obiad': 'Obiad',
    'Kolacja': 'Kolacja',
    'kolacja': 'Kolacja',
    'Przekąska': 'Przekąska',
    'przekaska': 'Przekąska'
  };
  return map[key] || key;
}
