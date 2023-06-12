import React from "react";

interface IPagination {
  items: number;
  pageSize: number;
  currentPage: number;
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/ban-types
  onPageChange: (page: number) => {};
}

const Pagination: React.FC<IPagination> = ({
  items,
  pageSize,
  currentPage,
  onPageChange,
}) => {
  const pagesCount = Math.ceil(items / pageSize); // 100/10

  if (pagesCount === 1) return null;
  const pages: number[] = Array.from({ length: pagesCount }, (_, i) => i + 1);

  return (
    <ul>
      {React.Children.toArray(
        pages.map((page) => (
          <li className={page === currentPage ? "pageItemActive" : "pageItem"}>
            <button
              type="button"
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          </li>
        ))
      )}
    </ul>
  );
};

export default Pagination;
