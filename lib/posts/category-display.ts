const ADVERTISEMENT_CATEGORY_TYPE = 'ADVERTISEMENT';
const ADVERTISEMENT_CATEGORY_LABEL_KO = '업체홍보';

export function getCategoryDisplayName(category: {
  name: string;
  type?: string | null;
}) {
  if (category.type === ADVERTISEMENT_CATEGORY_TYPE) {
    return ADVERTISEMENT_CATEGORY_LABEL_KO;
  }

  return category.name;
}
