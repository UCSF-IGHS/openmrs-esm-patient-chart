import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { debounce } from 'lodash-es';
import fuzzy from 'fuzzy';
import { formatDatetime, useLayoutType, ResponsiveWrapper } from '@openmrs/esm-framework';
import type { CompletedFormInfo, Form } from '../types';
import FormsTable from './forms-table.component';
import styles from './forms-list.scss';
import { DataTableSkeleton, InlineLoading } from '@carbon/react';

export type FormsListProps = {
  completedForms?: Array<CompletedFormInfo>;
  error?: any;
  sectionName?: string;
  handleFormOpen: (form: Form, encounterUuid: string) => void;
  // Infinite scrolling props
  onSearch?: (searchTerm: string) => void;
  isValidating?: boolean;
  loadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  totalLoaded?: number;
  enableInfiniteScrolling?: boolean;
};

/*
 * For the benefit of our automated translations:
 * t('forms', 'Forms')
 */

const FormsList: React.FC<FormsListProps> = ({
  completedForms,
  error,
  sectionName = 'forms',
  handleFormOpen,
  onSearch,
  isValidating,
  loadMore,
  hasMore,
  isLoading,
  totalLoaded = 0,
  enableInfiniteScrolling = false,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const isTablet = useLayoutType() === 'tablet';
  const [locale, setLocale] = useState(window.i18next.language ?? navigator.language);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.i18next?.on) {
      const languageChanged = (lng: string) => setLocale(lng);
      window.i18next.on('languageChanged', languageChanged);
      return () => window.i18next.off('languageChanged', languageChanged);
    }
  }, []);

  // Handle search with debounce
  const handleSearch = useMemo(
    () =>
      debounce((searchTerm: string) => {
        setSearchTerm(searchTerm);
        onSearch?.(searchTerm);
      }, 1000),
    [onSearch],
  );

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    // Exit early if infinite scrolling is not enabled or loadMore function is not provided
    if (!enableInfiniteScrolling || !loadMore) {
      return;
    }

    // Create a new IntersectionObserver instance
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        // Load more items when the element is intersecting (visible) and more items are available
        if (first.isIntersecting && hasMore && !isValidating) {
          loadMore();
        }
      },
      {
        // Even more aggressive settings to ensure it triggers reliably
        threshold: 0.01, // Trigger when even 1% of the element is visible
        rootMargin: '500px 0px', // Start loading 500px before the element comes into view
      },
    );

    observerRef.current = observer;

    // Observe the element if it's already available
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enableInfiniteScrolling, loadMore, hasMore, isValidating]);

  // Create a callback ref to observe the element when it becomes available
  const setLoadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Clean up previous observation if needed
      if (loadMoreRef.current && observerRef.current) {
        observerRef.current.unobserve(loadMoreRef.current);
      }

      // Update the ref to point to the new node
      loadMoreRef.current = node;

      // Only observe if all conditions are met
      if (node && observerRef.current && hasMore && enableInfiniteScrolling) {
        observerRef.current.observe(node);

        // Force re-check intersection on new element (helps with cases where the element is already in view)
        setTimeout(() => {
          if (node.getBoundingClientRect().top < window.innerHeight && hasMore && !isValidating) {
            loadMore?.();
          }
        }, 100);
      }
    },
    [hasMore, enableInfiniteScrolling, loadMore, isValidating],
  ); // Force a re-check on visibility after component mount and when form data changes
  useEffect(() => {
    if (enableInfiniteScrolling && hasMore && !isValidating && loadMore) {
      // Give time for the component to render
      const timeoutId = setTimeout(() => {
        // Check if we have fewer items than would fill the screen
        const container = document.querySelector(`.${styles.infiniteScrollContainer}`);
        const viewportHeight = window.innerHeight;

        if (container) {
          const containerRect = container.getBoundingClientRect();
          // Special handling for RFE forms - if section name is RFE Forms, be more aggressive about loading
          const isRFESection = sectionName?.toLowerCase().includes('rfe');
          const shouldLoadMore =
            // Standard conditions for loading more
            containerRect.height < viewportHeight * 0.8 ||
            (loadMoreRef.current && loadMoreRef.current.getBoundingClientRect().top < viewportHeight) ||
            // Special condition for RFE forms - load more aggressively
            (isRFESection && completedForms && completedForms.length < 20 && totalLoaded > completedForms.length);

          if (shouldLoadMore) {
            loadMore();
          }
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [completedForms, enableInfiniteScrolling, hasMore, isValidating, loadMore, sectionName, totalLoaded]);

  const filteredForms = useMemo(() => {
    // If using infinite scrolling with server-side search, don't filter client-side
    if (enableInfiniteScrolling && onSearch) {
      return completedForms;
    }

    if (!searchTerm) {
      return completedForms;
    }

    return fuzzy
      .filter(searchTerm, completedForms, { extract: (formInfo) => formInfo.form.display ?? formInfo.form.name })
      .sort((r1, r2) => r1.score - r2.score)
      .map((result) => result.original);
  }, [completedForms, searchTerm, enableInfiniteScrolling, onSearch]);

  const tableHeaders = useMemo(() => {
    return [
      {
        header: t('formName', 'Form name (A-Z)'),
        key: 'formName',
      },
      {
        header: t('lastCompleted', 'Last completed'),
        key: 'lastCompleted',
      },
    ];
  }, [t]);

  const tableRows = useMemo(
    () =>
      filteredForms?.map((formData) => {
        return {
          id: formData.form.uuid,
          lastCompleted: formData.lastCompletedDate ? formatDatetime(formData.lastCompletedDate) : undefined,
          formName: formData.form.display ?? formData.form.name,
          formUuid: formData.form.uuid,
          encounterUuid: formData?.associatedEncounters[0]?.uuid,
          form: formData.form,
        };
      }) ?? [],
    [filteredForms],
  );

  if (!completedForms && !error && (isLoading || isValidating)) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (completedForms?.length === 0 && !isLoading) {
    return <></>;
  }

  const tableComponent = enableInfiniteScrolling ? (
    <div className={styles.infiniteScrollContainer}>
      <FormsTable
        tableHeaders={tableHeaders}
        tableRows={tableRows}
        isTablet={isTablet}
        handleSearch={onSearch ? onSearch : handleSearch}
        handleFormOpen={handleFormOpen}
        totalLoaded={totalLoaded}
      />

      {/* Load more trigger */}
      {hasMore && (
        <div
          ref={setLoadMoreRef}
          className={styles.loadMoreTrigger}
          data-testid="load-more-trigger"
          style={{
            minHeight: '200px',
            padding: '20px',
            visibility: 'visible',
            margin: '20px 0',
            border: '1px dashed #e0e0e0',
            borderRadius: '4px',
          }}
        >
          {isValidating ? (
            <InlineLoading description={t('loadingMoreForms', 'Loading more forms...')} />
          ) : (
            <div style={{ minHeight: '50px', padding: '20px', textAlign: 'center' }}>
              {t('scrollToLoadMore', 'Scroll to load more forms...')}
            </div>
          )}
        </div>
      )}

      {/* End of results indicator */}
      {!hasMore && completedForms && completedForms.length > 0 && (
        <div className={styles.endOfResults}>
          {t('allFormsLoaded', 'All forms loaded ({{count}} total)', { count: totalLoaded })}
        </div>
      )}
    </div>
  ) : (
    <FormsTable
      tableHeaders={tableHeaders}
      tableRows={tableRows}
      isTablet={isTablet}
      handleSearch={handleSearch}
      handleFormOpen={handleFormOpen}
      totalLoaded={totalLoaded}
    />
  );

  if (sectionName === 'forms') {
    return <ResponsiveWrapper>{tableComponent}</ResponsiveWrapper>;
  } else {
    return (
      <ResponsiveWrapper>
        <div className={isTablet ? styles.tabletHeading : styles.desktopHeading}>
          <h4>{t(sectionName)}</h4>
        </div>
        {tableComponent}
      </ResponsiveWrapper>
    );
  }
};

export default FormsList;
