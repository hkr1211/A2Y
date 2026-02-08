import { ref, reactive } from 'vue';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';

export function usePagination() {
  const loading = ref(false);
  const pagination = reactive({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });

  function handlePageChange(page: number) {
    pagination.page = page;
  }

  function handleSizeChange(size: number) {
    pagination.pageSize = size;
    pagination.page = 1;
  }

  function resetPagination() {
    pagination.page = 1;
    pagination.total = 0;
  }

  return {
    loading,
    pagination,
    handlePageChange,
    handleSizeChange,
    resetPagination,
  };
}
