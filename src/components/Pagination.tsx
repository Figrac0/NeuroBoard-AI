import { Icon } from '@/components/Icon'
import { useLanguageStore } from '@/stores/languageStore'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const language = useLanguageStore((store) => store.language)

  if (totalPages <= 1) {
    return null
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <nav
      className="pagination"
      aria-label={language === 'ru' ? 'Пагинация объявлений' : 'Listings pagination'}
    >
      <button
        type="button"
        className="pagination__button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label={language === 'ru' ? 'Назад' : 'Previous'}
        title={language === 'ru' ? 'Назад' : 'Previous'}
      >
        <Icon name="arrow-left" />
      </button>

      {pages.map((item) => (
        <button
          key={item}
          type="button"
          className={`pagination__button ${item === page ? 'pagination__button--active' : ''}`}
          onClick={() => onPageChange(item)}
          aria-current={item === page ? 'page' : undefined}
        >
          {item}
        </button>
      ))}

      <button
        type="button"
        className="pagination__button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label={language === 'ru' ? 'Вперёд' : 'Next'}
        title={language === 'ru' ? 'Вперёд' : 'Next'}
      >
        <Icon name="arrow-right" />
      </button>
    </nav>
  )
}
