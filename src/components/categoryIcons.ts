export function getCategoryIcon(category: string): string {
  switch (category.toLowerCase()) {
    case 'household': return 'home-outline';
    case 'health':    return 'heart-outline';
    case 'auto':      return 'car-outline';
    case 'family':    return 'people-outline';
    case 'finance':   return 'cash-outline';
    case 'admin':     return 'document-text-outline';
    case 'purchases': return 'cart-outline';
    case 'other':     return 'ellipsis-horizontal-circle-outline';
    default:          return 'tag-outline';
  }
}
