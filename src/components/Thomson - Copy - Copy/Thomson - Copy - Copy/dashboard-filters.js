/* eslint-disable */
/**
 * Dashboard Filters - Master Utility
 * Version: 2.0
 *
 * A comprehensive, reusable utility for ALL filter functionality across dashboards
 * Components: Moving Average, Time Period, Custom Panel filters, Calendar date range picker
 *
 * Usage:
 *   1. Include: <script src="dashboard-filters.js"></script>
 *   2. Initialize: DashboardFilters.init({ ...config })
 *
 * Example:
 *   DashboardFilters.init({
 *       container: '#dashboard-container',
 *       movingAverage: {
 *           enabled: true,
 *           period: 13,
 *           maxWeeks: 52,
 *           onWeekChange: (week) => { refreshData(); }
 *       },
 *       timeFilters: {
 *           enabled: true,
 *           categories: ['Day', 'Week', 'Month', 'Quarter', 'Year']
 *       },
 *       customFilters: [
 *           { id: 'region', label: 'Region', dataSource: [...] }
 *       ],
 *       calendar: { enabled: true },
 *       onFilterChange: (filters) => { applyFilters(filters); }
 *   });
 */

const DashboardFilters = (function () {
    'use strict';

    // ==================== PRIVATE CONFIGURATION ====================

    const defaultConfig = {
        container: '#otif-dashboard-container',

        // Moving Average Configuration
        movingAverage: {
            enabled: false,
            period: 13,
            maxWeeks: 52,
            lineColor: '#03A9F4',
            lineDash: [5, 5],
            dropdownSelector: '.modal-header .ms-auto',
            onWeekChange: null  // Callback when MA week changes
        },

        // Time Period Filter Configuration
        timeFilters: {
            enabled: true,
            categories: ['Day', 'Week', 'Month', 'Quarter', 'Year'],
            defaultSelection: 'Week',
            containerSelector: '#timeFilterContainer'
        },

        // Custom Panel Filter Configuration
        customFilters: {
            enabled: true,
            filters: [],  // Array: [{ id, label, dataSource, type, width }]
            panelSelector: '#filter-popup-panel',
            containerSelector: '#dropdown-filters-section'
        },

        // Filter Panel Management Configuration
        filterPanel: {
            enabled: true,
            panelSelector: '#filter-popup-panel',
            toggleButtonSelector: '#toggle-filter-panel-btn',
            closeButtonSelector: '#close-filter-panel-btn',
            applyButtonSelector: '#apply-filters-btn-new',
            resetButtonSelector: '#reset-filters-btn-new',
            hiddenClass: 'd-none'
        },

        // Calendar Configuration
        calendar: {
            enabled: true,
            containerSelector: '#calendar-container',
            gridSelector: '#calendar-grid',
            prevButtonSelector: '#prev-month-btn',
            nextButtonSelector: '#next-month-btn',
            todayButtonSelector: '#today-btn',
            monthYearDisplaySelector: '#month-year-display',
            fromDateSelector: '#selected-from-date',
            toDateSelector: '#selected-to-date'
        },

        // Status Banner Configuration
        statusBanner: {
            enabled: true,
            containerSelector: '#filter-status-banner',
            textSelector: '#filter-status-text'
        },

        // Global callback when ANY filter changes
        onFilterChange: null
    };

    // ==================== PRIVATE STATE ====================

    // Helper to calculate Thomson week number (Fri-Thu, anchored at 26-Dec-2025)
    function getThomsonWeekNumber(d) {
        const anchor = new Date(2025, 11, 26); // 26-Dec-2025 (Friday = Week 1 start)
        anchor.setHours(0, 0, 0, 0);
        const day = new Date(d);
        day.setHours(0, 0, 0, 0);
        const diffMs = day - anchor;
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays < 0) return 1; // Before anchor, default to week 1
        return Math.floor(diffDays / 7) + 1;
    }

    const currentWeekNum = getThomsonWeekNumber(new Date());

    const state = {
        initialized: false,
        config: null,

        // Filter Interaction State
        activeFilterType: null,  // Track which filter is active: 'movingAverage', 'timePeriod', or null

        // Moving Average State
        movingAverage: {
            enabledCharts: new Map(),  // chartId -> {instance, options, originalData}
            currentWeek: currentWeekNum, // Dynamic current week
            currentPeriod: 13,
            type: 'full',
            dropdownInitialized: false
        },

        // Filter State (Single source of truth)
        activeFilters: {
            timeSelection: [],
            timeSelectionCategory: null,
            customFilters: {},  // { filterId: [values] }
            startDate: null,
            endDate: null
        },

        // Calendar State
        calendarState: {
            startDate: null,
            endDate: null,
            hoveredDate: null,
            currentYear: new Date().getFullYear(),
            currentMonth: new Date().getMonth(),
            // Temp state for picker
            pickerMonth: null,
            pickerYear: null
        },

        // UI State
        currentOpenDropdown: null,  // Reference to open time filter dropdown
        filterPanelInitialized: false
    };

    // ==================== PRIVATE: UTILITIES ====================

    /**
     * Merge user config with defaults (deep merge)
     */
    function mergeConfig(userConfig) {
        const merged = JSON.parse(JSON.stringify(defaultConfig));

        if (userConfig.movingAverage) {
            Object.assign(merged.movingAverage, userConfig.movingAverage);
        }
        if (userConfig.timeFilters) {
            Object.assign(merged.timeFilters, userConfig.timeFilters);
        }
        if (userConfig.customFilters) {
            if (Array.isArray(userConfig.customFilters)) {
                merged.customFilters.enabled = true; // Enable when filters array is provided
                merged.customFilters.filters = userConfig.customFilters;
            } else {
                merged.customFilters.enabled = userConfig.customFilters.enabled !== false;
                merged.customFilters.filters = userConfig.customFilters.filters || [];
            }
        }
        if (userConfig.filterPanel) {
            Object.assign(merged.filterPanel, userConfig.filterPanel);
        }
        if (userConfig.calendar) {
            Object.assign(merged.calendar, userConfig.calendar);
        }
        if (userConfig.container) {
            merged.container = userConfig.container;
        }
        if (userConfig.onFilterChange) {
            merged.onFilterChange = userConfig.onFilterChange;
        }

        return merged;
    }

    /**
     * Update the filter status banner with current filter state
     */
    function updateFilterStatusBanner() {
        if (!state.config.statusBanner.enabled) return;

        const container = document.querySelector(state.config.statusBanner.containerSelector);
        if (!container) return;

        const parts = [];

        // 1. Moving Average status
        const period = state.config.movingAverage.period || 13;
        const currentWeek = state.movingAverage.currentWeek;
        const startWeek = Math.max(1, currentWeek - period + 1);
        const fmtW = (w) => `26-${String(w).padStart(2, '0')}`;
        parts.push(`<span class="filter-status-item"><span class="filter-item-label">Period:</span><span class="filter-item-value">${period}-Week MA (${fmtW(startWeek)} – ${fmtW(currentWeek)})</span></span>`);

        // 2. Time filter selection
        const timeCategory = state.activeFilters.timeSelectionCategory;
        const timeSelection = state.activeFilters.timeSelection;
        if (timeCategory && timeSelection && timeSelection.length > 0) {
            const displayValue = timeSelection.length === 1 ? timeSelection[0] : `${timeSelection.length} selections`;
            parts.push(`<span class="filter-status-item"><span class="filter-item-label">${timeCategory}:</span><span class="filter-item-value">${displayValue}</span></span>`);
        }

        // 3. Date Range (if set)
        const startDate = state.calendarState.startDate;
        const endDate = state.calendarState.endDate;
        if (startDate && endDate) {
            const formatDate = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            parts.push(`<span class="filter-status-item"><span class="filter-item-label">Date:</span><span class="filter-item-value">${formatDate(startDate)} - ${formatDate(endDate)}</span></span>`);
        } else if (startDate) {
            const formatDate = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            parts.push(`<span class="filter-status-item"><span class="filter-item-label">From:</span><span class="filter-item-value">${formatDate(startDate)}</span></span>`);
        }

        // 4. Custom Filters (if any are selected)
        const customFilters = state.activeFilters.customFilters;
        for (const [filterId, values] of Object.entries(customFilters)) {
            if (values && values.length > 0 && !values.includes('All') && !values.includes('Select All')) {
                const displayValue = values.length === 1 ? values[0] : `${values.length} selected`;
                // Capitalize first letter of filter id for display
                const label = filterId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                parts.push(`<span class="filter-status-item"><span class="filter-item-label">${label}:</span><span class="filter-item-value">${displayValue}</span></span>`);
            }
        }

        // Build final HTML
        const statusHTML = `<i class="bi bi-funnel-fill"></i><span class="filter-status-label">Viewing:</span>${parts.join('<span class="filter-status-separator">|</span>')}`;
        container.innerHTML = statusHTML;

        // Also update the chips beside the title
        updateFilterDisplay();
    }

    /**
     * Update filter display beside dashboard title
     */
    function updateFilterDisplay() {
        let container = document.getElementById('activeFiltersDisplay');

        // Auto-create container if missing (Fix for missing chip issue)
        if (!container) {
            const dashboardTitle = document.querySelector('#dashboardTitle, .dashboard-title');
            if (dashboardTitle) {
                container = document.createElement('span');
                container.id = 'activeFiltersDisplay';
                container.className = 'filter-display-container ms-3';
                container.style.display = 'inline-flex';
                container.style.gap = '0.5rem';
                container.style.flexWrap = 'wrap';
                dashboardTitle.appendChild(container); // Append activeFiltersDisplay to dashboard title
            } else {
                return; // Cannot find title to attach to
            }
        }

        const chips = [];

        // MA Filter (if active)
        if (state.activeFilterType === 'movingAverage' && state.movingAverage.currentWeek) {
            const currentWeek = state.movingAverage.currentWeek;
            const period = state.config.movingAverage.period || 13;
            const startWeek = Math.max(1, currentWeek - period + 1);
            const fmtW = (w) => `26-${String(w).padStart(2, '0')}`;
            const weekLabel = `${fmtW(startWeek)} – ${fmtW(currentWeek)}`;
            const maLabel = `${period}-Week MA`;
            chips.push(`<span class="filter-chip filter-chip-ma">
                            <span class="filter-chip-label">${maLabel}:</span>${weekLabel}
                            <span class="filter-chip-remove" onclick="DashboardFilters.clearMovingAverage()" title="Clear MA"><i class="bi bi-x"></i></span>
                        </span>`);
        }

        // Time Period Filter (if active)
        if (state.activeFilterType === 'timePeriod') {
            if (state.activeFilters.timeSelection && state.activeFilters.timeSelection.length > 0) {
                const timeLabel = state.activeFilters.timeSelection.join(', ');
                const category = state.activeFilters.timeSelectionCategory || 'Time';
                chips.push(`<span class="filter-chip filter-chip-time">
                                <span class="filter-chip-label">${category}:</span>${timeLabel}
                                <span class="filter-chip-remove" onclick="DashboardFilters.clearTimeFilters()" title="Clear Time Filter"><i class="bi bi-x"></i></span>
                            </span>`);
            } else if (state.calendarState.startDate) {
                const formatDate = (date) => {
                    const d = new Date(date);
                    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                };
                const dateRange = state.calendarState.endDate
                    ? `${formatDate(state.calendarState.startDate)} - ${formatDate(state.calendarState.endDate)}`
                    : formatDate(state.calendarState.startDate);
                chips.push(`<span class="filter-chip filter-chip-time">
                                <span class="filter-chip-label">Date:</span>${dateRange}
                                <span class="filter-chip-remove" onclick="DashboardFilters.clearTimeFilters()" title="Clear Date Range"><i class="bi bi-x"></i></span>
                            </span>`);
            }
        }

        // Custom Filters (if active)
        if (state.activeFilters.customFilters) {
            Object.entries(state.activeFilters.customFilters).forEach(([key, values]) => {
                if (values && values.length > 0) {
                    const filterLabel = key.replace(/([A-Z])/g, ' $1').trim(); // Convert camelCase to Title Case
                    const valueLabel = values.join(', ');
                    chips.push(`<span class="filter-chip filter-chip-custom">
                                    <span class="filter-chip-label">${filterLabel}:</span>${valueLabel}
                                    <span class="filter-chip-remove" onclick="DashboardFilters.clearCustomFilter('${key}')" title="Clear ${filterLabel}"><i class="bi bi-x"></i></span>
                                </span>`);
                }
            });
        }

        // Update container
        container.innerHTML = chips.join('');
    }

    /**
     * Trigger filter change callback
     */
    function triggerFilterChange() {
        // Update the filter status banner
        updateFilterStatusBanner();

        // Update filter display beside title
        updateFilterDisplay();

        if (state.config.onFilterChange && typeof state.config.onFilterChange === 'function') {
            const filters = collectAllFilters();
            state.config.onFilterChange(filters);
        }
    }

    /**
     * Collect all active filter values into a single object
     */
    function collectAllFilters() {
        // Get custom filter values if DevExtreme is available
        let customFilterValues = {};
        if (typeof $ !== 'undefined' && state.config && state.config.customFilters.enabled) {
            customFilterValues = getCustomFilterValues();
        }

        return {
            // Moving Average
            movingAverage: {
                currentWeek: state.movingAverage.currentWeek,
                period: state.movingAverage.currentPeriod,
                type: state.movingAverage.type
            },
            // Time Period & Calendar
            timeSelection: state.activeFilters.timeSelection,
            timeSelectionCategory: state.activeFilters.timeSelectionCategory,
            startDate: state.calendarState.startDate,
            endDate: state.calendarState.endDate,
            // Custom Filters (merged with state and DevExtreme values)
            customFilters: { ...state.activeFilters.customFilters, ...customFilterValues }
        };
    }

    // ==================== FILTER INTERACTION UTILITIES ====================

    /**
     * Disable a filter group (add visual feedback and prevent interaction)
     */
    function disableFilterGroup(filterType) {
        // Functionality removed to allow auto-switching (items remain clickable)
        return;
    }

    /**
     * Enable a filter group (remove visual feedback and allow interaction)
     */
    function enableFilterGroup(filterType) {
        // Functionality removed to allow auto-switching
        return;
    }

    /**
     * Enable Moving Average filter and disable Time Period filters
     */
    /**
     * Clear Moving Average selection and remove from charts
     */
    function clearMovingAverage() {
        // Reset active filter type if it was MA
        if (state.activeFilterType === 'movingAverage') {
            state.activeFilterType = null;
        }

        // Remove active class from MA dropdown items
        const maMenu = document.getElementById('maDropdownMenu');
        if (maMenu) {
            maMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        }

        // Remove MA lines from all charts
        state.movingAverage.enabledCharts.forEach((chartData) => {
            removeMADatasetFromChart(chartData.instance);
            chartData.instance.update();
        });

        console.log('DashboardFilters: Moving Average cleared');
    }

    /**
     * Enable Moving Average filter and disable Time Period filters
     */
    function enableMovingAverageFilter() {
        // Force cleanup regardless of current state
        // if (state.activeFilterType === 'movingAverage') return; // REMOVED to ensure UI sync

        // Clear Time Period selections
        state.activeFilters.timeSelection = [];
        state.activeFilters.timeSelectionCategory = null;
        state.calendarState.startDate = null;
        state.calendarState.endDate = null;

        // Close any open time filter dropdown
        closeTimeDropdown();

        // Visually clear Time Period buttons
        const container = document.querySelector(state.config.timeFilters.containerSelector);
        if (container) {
            container.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        }

        // Update active filter type
        state.activeFilterType = 'movingAverage';

        console.log('DashboardFilters: Moving Average enabled');
    }

    /**
     * Enable Time Period filter and disable Moving Average
     */
    function enableTimePeriodFilter() {
        if (state.activeFilterType === 'timePeriod') return; // Already active

        // Update active filter type
        state.activeFilterType = 'timePeriod';

        console.log('DashboardFilters: Time Period enabled');
    }

    /**
     * Clear filter type restrictions (called on reset)
     */
    function clearFilterRestrictions() {
        if (state.activeFilterType === 'movingAverage') {
            enableFilterGroup('timePeriod');
        } else if (state.activeFilterType === 'timePeriod') {
            enableFilterGroup('movingAverage');
        }

        state.activeFilterType = null;
        console.log('DashboardFilters: Filter restrictions cleared');
    }

    /**
     * Clear Time Period Filters (called by chip close button)
     */
    function clearTimeFilters() {
        // Clear state
        state.activeFilters.timeSelection = [];
        state.activeFilters.timeSelectionCategory = null;
        state.calendarState.startDate = null;
        state.calendarState.endDate = null;

        // Reset UI: remove active class from time buttons
        const container = document.querySelector(state.config.timeFilters.containerSelector);
        if (container) {
            container.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        }

        // Close any open dropdowns
        closeTimeDropdown();

        // If no other filters are active, reset activeFilterType
        // (For now, just clear it if it was timePeriod)
        if (state.activeFilterType === 'timePeriod') {
            state.activeFilterType = null;
            clearFilterRestrictions();
        }

        // Trigger change to update charts
        triggerFilterChange();
        console.log('DashboardFilters: Time filters cleared via chip');
    }

    /**
     * Clear specific Custom Filter (called by chip close button)
     */
    function clearCustomFilter(filterId) {
        if (!state.activeFilters.customFilters[filterId]) return;

        // Clear value in state
        delete state.activeFilters.customFilters[filterId];

        // Reset UI: Clear DevExtreme DropDownBox value
        if (typeof $ !== 'undefined') {
            const instance = $(`#${filterId}`).dxDropDownBox('instance');
            if (instance) {
                instance.option('value', []);
            }
        }

        // Trigger change
        triggerFilterChange();
        console.log(`DashboardFilters: Custom filter '${filterId}' cleared via chip`);
    }

    // ==================== MOVING AVERAGE COMPONENT ====================

    /**
     * Calculate Simple Moving Average
     */
    function calculateSMA(data, period) {
        if (!period || period <= 0 || !data || data.length === 0) return data;

        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (data[i] === null || data[i] === undefined) {
                result.push(null);
                continue;
            }

            if (i < period - 1) {
                // Cumulative average for initial values
                const slice = data.slice(0, i + 1).filter(v => v !== null && v !== undefined);
                const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
                result.push(parseFloat(avg.toFixed(1)));
            } else {
                // Rolling average
                const slice = data.slice(i - period + 1, i + 1).filter(v => v !== null && v !== undefined);
                if (slice.length > 0) {
                    const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
                    result.push(parseFloat(avg.toFixed(1)));
                } else {
                    result.push(null);
                }
            }
        }
        return result;
    }

    /**
     * Generate MA dropdown HTML
     * NOTE: Not used - HTML should exist in dashboard file
     * Kept for reference only
     */
    // function generateMADropdownHTML() {
    //     return `...`;
    // }

    /**
     * Generate MA week options (Thomson Fri-Thu weeks, anchored at 26-Dec-2025)
     */
    function generateMAWeekOptions() {
        const container = document.getElementById('maWeekOptions');
        if (!container) return;

        const fragment = document.createDocumentFragment();
        const period = state.config.movingAverage.period || 13; // Default 13

        // Helper to get date range for a Thomson week (Fri-Thu, anchor = 26-Dec-2025)
        const getDateTupleOfWeek = (w) => {
            const anchor = new Date(2025, 11, 26); // 26-Dec-2025 (Friday)
            const start = new Date(anchor);
            start.setDate(anchor.getDate() + (w - 1) * 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return { start, end };
        };

        // Format week label as 26-XX
        const fmtW = (w) => `26-${String(w).padStart(2, '0')}`;
        const options = { day: '2-digit', month: 'short' };

        for (let week = 1; week <= state.config.movingAverage.maxWeeks; week++) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'dropdown-item ma-week-option';
            a.href = '#';
            a.setAttribute('data-ma-type', 'week');
            a.setAttribute('data-ma-week', week);

            // Calculate the full MA date range (from startWeek to this week)
            const startWeekNum = Math.max(1, week - period + 1);
            const rangeStart = getDateTupleOfWeek(startWeekNum).start;
            const rangeEnd = getDateTupleOfWeek(week).end;

            // Format: "26 Dec - 01 Jan"
            const dateRangeStr = `${rangeStart.toLocaleDateString('en-GB', options)} - ${rangeEnd.toLocaleDateString('en-GB', options)}`;

            a.innerHTML = `
                <div class="d-flex justify-content-between align-items-center w-100">
                    <span class="fw-bold">${fmtW(week)}</span>
                    <span class="ma-week-range small" style="font-size: 0.85rem;">${dateRangeStr}</span>
                </div>
            `;
            li.appendChild(a);
            fragment.appendChild(li);
        }
        if (container) {
            container.appendChild(fragment);
        }

        // Update default option text (Dynamic Last 13 Weeks)
        const defaultItem = document.querySelector('.otif-ma-dropdown-menu .dropdown-item[data-ma-type="full"]');
        if (defaultItem) {
            const currentWeek = state.movingAverage.currentWeek;
            const startWeek = Math.max(1, currentWeek - period + 1);
            const fmtW2 = (w) => `26-${String(w).padStart(2, '0')}`;
            defaultItem.textContent = `(last) ${period}-Week-MA (${fmtW2(startWeek)} – ${fmtW2(currentWeek)})`;
            defaultItem.setAttribute('data-ma-week', currentWeek);

            // Highlight if active
            if (state.activeFilterType === 'movingAverage' && state.movingAverage.currentWeek === currentWeek) {
                defaultItem.classList.add('active');
            }
        }
    }

    /**
     * Update MA button text based on current state (Thomson 26-XX format)
     */
    function updateMAButtonText() {
        const maButtonText = document.querySelector(state.config.movingAverage.buttonTextSelector);
        if (!maButtonText) return;

        const period = state.config.movingAverage.period || 13;
        const currentWeek = state.movingAverage.currentWeek;
        const startWeek = Math.max(1, currentWeek - period + 1);
        const endWeek = currentWeek;
        const fmtW = (w) => `26-${String(w).padStart(2, '0')}`;

        maButtonText.textContent = `MA (${fmtW(startWeek)} – ${fmtW(endWeek)})`;
    }

    /**
     * Setup MA search handler
     */
    function setupMASearchHandler() {
        const searchInput = document.getElementById('maSearchInput');
        if (!searchInput) return;

        searchInput.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            const weekOptions = document.querySelectorAll('.ma-week-option');

            weekOptions.forEach(option => {
                const text = option.textContent.toLowerCase();
                const weekNum = option.getAttribute('data-ma-week');

                if (text.includes(searchTerm) || weekNum.includes(searchTerm)) {
                    option.classList.remove('hidden');
                    option.parentElement.style.display = '';
                } else {
                    option.classList.add('hidden');
                    option.parentElement.style.display = 'none';
                }
            });
        });

        searchInput.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }

    /**
     * Setup MA dropdown events
     */
    function setupMADropdownEvents() {
        const dropdown = document.getElementById('maDropdownMenu');
        if (!dropdown) return;

        dropdown.addEventListener('click', function (e) {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;

            e.preventDefault();

            this.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const maType = item.getAttribute('data-ma-type');
            const weekNumber = parseInt(item.getAttribute('data-ma-week'));

            state.movingAverage.type = maType;
            state.movingAverage.currentWeek = weekNumber;

            // Enable Moving Average filter (disables Time Period filters)
            enableMovingAverageFilter();

            // Update button text (Thomson 26-XX format)
            const maButtonText = document.getElementById('maButtonText');
            if (maButtonText) {
                const period = state.config.movingAverage.period;
                const startWeek = weekNumber <= period ? 1 : weekNumber - period + 1;
                const fmtW = (w) => `26-${String(w).padStart(2, '0')}`;
                maButtonText.textContent = `MA (${fmtW(startWeek)} – ${fmtW(weekNumber)})`;
            }

            // Update filter status banner
            triggerFilterChange();

            // Trigger callback if registered
            if (state.config.movingAverage.onWeekChange) {
                state.config.movingAverage.onWeekChange(weekNumber);
                return;
            }

            // Update all charts
            updateAllMACharts();
        });
    }

    /**
     * Add MA dataset to chart
     */
    function addMADatasetToChart(chartInstance, maData, options, startWeek = null, endWeek = null) {
        const period = options.period || state.config.movingAverage.period;
        const currentWeek = state.movingAverage.currentWeek;
        const start = startWeek !== null ? startWeek + 1 : 1;
        const end = endWeek !== null ? endWeek : currentWeek;

        const maDataset = {
            type: 'line',
            label: ` MA (Week ${start}-${end})`,
            data: maData,
            borderColor: options.lineColor || state.config.movingAverage.lineColor,
            backgroundColor: 'transparent',
            pointBackgroundColor: options.lineColor || state.config.movingAverage.lineColor,
            borderWidth: 2,
            borderDash: options.lineDash || state.config.movingAverage.lineDash,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.4,
            order: -1
        };

        chartInstance.data.datasets.push(maDataset);
        chartInstance.update('none');
    }

    /**
     * Remove MA dataset from chart
     */
    function removeMADatasetFromChart(chartInstance) {
        chartInstance.data.datasets = chartInstance.data.datasets.filter(
            ds => !ds.label || !ds.label.includes('MA')
        );
    }

    /**
     * Update all MA-enabled charts
     */
    function updateAllMACharts() {
        state.movingAverage.enabledCharts.forEach((chartData, chartId) => {
            const { instance, options, originalData } = chartData;

            removeMADatasetFromChart(instance);

            const period = options.period || state.config.movingAverage.period;
            const currentWeek = state.movingAverage.currentWeek;

            const startIdx = currentWeek <= period ? 0 : currentWeek - period;
            const endIdx = currentWeek;

            const fullDataForMA = originalData.slice(0, currentWeek);
            const fullMAData = calculateSMA(fullDataForMA, period);
            const maData = fullMAData.slice(startIdx, endIdx);

            addMADatasetToChart(instance, maData, options, startIdx, endIdx);

            if (instance.data.labels && chartData.originalLabels) {
                instance.data.labels = chartData.originalLabels.slice(startIdx, endIdx);
            }

            instance.data.datasets.forEach((dataset, idx) => {
                if (!dataset.label || !dataset.label.includes('MA')) {
                    if (chartData.originalDatasets && chartData.originalDatasets[idx]) {
                        dataset.data = chartData.originalDatasets[idx].slice(startIdx, endIdx);
                    }
                }
            });

            instance.update();
        });
    }

    /**
     * Initialize Moving Average component
     */
    function initMovingAverage() {
        // Validate required elements exist in HTML
        const dropdown = document.querySelector(state.config.movingAverage.dropdownSelector);
        const buttonText = document.querySelector(state.config.movingAverage.buttonTextSelector);
        const weekOptionsContainer = document.querySelector(state.config.movingAverage.weekOptionsContainer);

        if (!dropdown || !buttonText || !weekOptionsContainer) {
            console.warn('DashboardFilters: MA dropdown elements not found in HTML');
            return;
        }
        if (state.movingAverage.currentWeek === 1 && state.config.movingAverage.maxWeeks > 1) {
            state.movingAverage.currentWeek = state.config.movingAverage.maxWeeks;
        }
        // Generate week options in existing container
        generateMAWeekOptions();

        // Setup event handlers
        setupMASearchHandler();
        setupMADropdownEvents();

        // Auto-switch: clicking MA button clears time filters
        const maButton = document.getElementById('maButton');
        if (maButton) {
            maButton.addEventListener('click', () => {
                if (state.activeFilterType === 'timePeriod') {
                    // Clear Time filters so MA can take over
                    state.activeFilters.timeSelection = [];
                    state.activeFilters.timeSelectionCategory = null;
                    clearFilterRestrictions(); // This re-enables MA (removes disabled state)
                    // We don't need to triggerFilterChange yet, as the user just opened the dropdown
                }
            });
        }

        // Update button text with initial state
        updateMAButtonText();

        // Set default active filter type to 'movingAverage' if not already set by URL/config
        if (!state.activeFilterType) {
            state.activeFilterType = 'movingAverage';
        }

        // Trigger initial display update (creates chip)
        triggerFilterChange();

        state.movingAverage.dropdownInitialized = true;
        console.log('DashboardFilters: Moving Average initialized');
    }

    // ==================== TIME PERIOD FILTER COMPONENT ====================

    /**
     * Generate dynamic time filter data
     */
    function getDynamicTimeFilterData() {
        const today = new Date();
        const currentYear = today.getFullYear();
        const getWeekNumber = (d) => {
            d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        };
        const currentWeek = `Week ${getWeekNumber(today)}`;
        const weeks = Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        return {
            Day: { title: 'SELECT DAY', items: ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days'] },
            Week: { title: 'SELECT WEEK', items: ['This Week', 'Last Week', 'Last 4 Weeks', ...weeks.filter(w => w !== currentWeek)] },
            Month: { title: 'SELECT MONTH', items: ['This Month', 'Last Month', ...monthNames] },
            Quarter: { title: 'SELECT QUARTER', items: ['This Quarter', 'Last Quarter', 'Q1', 'Q2', 'Q3', 'Q4'] },
            Year: { title: 'SELECT YEAR', items: ['This Year', 'Last Year', ...Array.from({ length: 8 }, (_, i) => `${currentYear - 2 - i}`)] }
        };
    }

    /**
     * Close time filter dropdown
     */
    function closeTimeDropdown() {
        if (state.currentOpenDropdown) {
            state.currentOpenDropdown.element.remove();
            document.removeEventListener('click', handleDocumentClickForClose);
            if (state.currentOpenDropdown.trigger) {
                state.currentOpenDropdown.trigger.classList.remove('active');
            }
            state.currentOpenDropdown = null;
        }
    }

    /**
     * Apply time filter selection and close dropdown
     */
    function applyAndCloseTimeDropdown(selection) {
        state.activeFilters.timeSelection = selection;
        state.activeFilters.timeSelectionCategory = selection.length > 0 ? state.currentOpenDropdown.trigger.dataset.category : null;

        // Enable Time Period filter if selections are made (disables Moving Average)
        if (selection.length > 0) {
            clearMovingAverage(); // Explicitly clear MA data/charts
            enableTimePeriodFilter();
        }

        // Clear calendar dates (mutual exclusivity)
        state.calendarState.startDate = null;
        state.calendarState.endDate = null;

        closeTimeDropdown();
        triggerFilterChange();
    }

    /**
     * Handle clicks outside dropdown
     */
    function handleDocumentClickForClose(event) {
        if (state.currentOpenDropdown &&
            !state.currentOpenDropdown.element.contains(event.target) &&
            !state.currentOpenDropdown.trigger.contains(event.target)) {
            const allItemCheckboxes = Array.from(state.currentOpenDropdown.element.querySelectorAll('.newdropdown-item .form-check-input'));
            const selectedValues = allItemCheckboxes
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            applyAndCloseTimeDropdown(selectedValues);
        }
    }

    /**
     * Create time filter dropdown
     */
    function createTimeDropdown(triggerBtn) {
        const category = triggerBtn.dataset.category;
        const timeFilterData = getDynamicTimeFilterData();
        const config = timeFilterData[category];
        if (!config) return;

        closeTimeDropdown();

        const container = document.querySelector(state.config.timeFilters.containerSelector);
        if (container) {
            container.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        }
        triggerBtn.classList.add('active');

        const dropdownEl = document.createElement('div');
        dropdownEl.className = 'newdropdown-popup';
        dropdownEl.innerHTML = `
            <div class="newdropdown-header">
                <!-- Select All Commented out for Single Selection -->
                <!--
                <label class="custom-checkbox-otif">
                    <input type="checkbox" id="newdropdown-select-all">
                    <span class="custom-checkbox-otif-box"></span>
                    <span class="custom-checkbox-otif-label">${config.title}</span>
                </label>
                -->
                <span class="newdropdown-popup__title" style="font-weight:600; font-size:0.85rem; color:var(--app-primary-color);">${config.title}</span>
                <!-- Clear Button Removed as per request -->
            </div>
            <div class="newdropdown-search-container">
                <input type="text" class="newdropdown-search-input" placeholder="Type to search...">
            </div>
            <ul class="newdropdown-list">
                ${config.items.map(item => `
                    <li class="newdropdown-item" data-value="${item}">
                        <label class="custom-checkbox-otif">
                            <!-- Switched to radio for Single Selection -->
                            <input type="radio" name="timeFilterRadio" value="${item}" class="form-check-input">
                            <span class="custom-checkbox-otif-box"></span>
                            <span class="custom-checkbox-otif-label">${item}</span>
                        </label>
                        <!-- ONLY button commented out
                        <span class="newdropdown-only-btn">ONLY</span>
                        -->
                    </li>
                `).join('')}
            </ul>`;

        let modalBody = document.querySelector(`${state.config.container} .modal-body`);
        if (!modalBody) {
            modalBody = document.querySelector(state.config.container);
        }

        if (!modalBody) {
            console.error('DashboardFilters: Could not find a valid container to attach dropdown');
            return;
        }
        modalBody.appendChild(dropdownEl);

        const rect = triggerBtn.getBoundingClientRect();
        const modalRect = modalBody.getBoundingClientRect();

        dropdownEl.style.top = `${rect.bottom - modalRect.top + modalBody.scrollTop + 5}px`;
        dropdownEl.style.right = `${modalRect.right - rect.right}px`;
        dropdownEl.style.left = 'auto';

        state.currentOpenDropdown = {
            element: dropdownEl,
            trigger: triggerBtn,
            items: Array.from(dropdownEl.querySelectorAll('.newdropdown-item'))
        };

        setTimeout(() => document.addEventListener('click', handleDocumentClickForClose), 0);

        // const selectAllCheckbox = dropdownEl.querySelector('#newdropdown-select-all');
        const searchInput = dropdownEl.querySelector('.newdropdown-search-input');
        const clearBtn = dropdownEl.querySelector('.newdropdown-clear-btn');

        // Clear button handler 
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                state.activeFilters.timeSelection = [];
                state.activeFilters.timeSelectionCategory = null;
                clearFilterRestrictions();
                closeTimeDropdown();
                triggerFilterChange();
            });
        }

        searchInput.addEventListener('keyup', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            state.currentOpenDropdown.items.forEach(item => {
                const itemText = item.dataset.value.toLowerCase();
                item.classList.toggle('is-hidden', !itemText.includes(searchTerm));
            });
        });

        /* Select All Logic Commented Out
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            state.currentOpenDropdown.items.forEach(item => {
                if (!item.classList.contains('is-hidden')) {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    checkbox.checked = isChecked;
                }
            });
        });
        */

        state.currentOpenDropdown.items.forEach(item => {
            // Updated selector to radio
            const radio = item.querySelector('input[type="radio"]');
            // const onlyBtn = item.querySelector('.newdropdown-only-btn');

            // Handle row click for Radio selection
            item.addEventListener('click', (e) => {
                // if (e.target !== onlyBtn) {
                // Radio button logic: Setting checked=true on one will uncheck others with same name
                radio.checked = true;

                // Immediately apply and close on selection (Single select behavior)
                applyAndCloseTimeDropdown([radio.value]);
                // }
            });

            /* ONLY button logic commented out
            onlyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                applyAndCloseTimeDropdown([radio.value]);
            });
            */
        });
    }

    /**
     * Initialize Time Period Filter
     */
    function initTimeFilters() {
        const container = document.querySelector(state.config.timeFilters.containerSelector);
        if (!container) {
            console.warn('DashboardFilters: Time filter container not found');
            return;
        }

        container.querySelectorAll('.btn.active').forEach(b => b.classList.remove('active'));

        if (state.config.timeFilters.defaultSelection && state.activeFilters.timeSelection.length === 0) {
            const defaultButton = container.querySelector(`.btn[data-category="${state.config.timeFilters.defaultSelection}"]`);
            if (defaultButton) {
                defaultButton.classList.add('active');
            }
        }

        if (container.dataset.listenerAttached) return;

        container.addEventListener('click', (event) => {
            event.stopPropagation();
            const clickedButton = event.target.closest('.btn');
            if (!clickedButton) return;

            // Auto-Switch: If Moving Average is active, clear it first
            if (state.activeFilterType === 'movingAverage') {
                clearMovingAverage();
                // Note: Clearing MA re-enables ability to click, allowing proceeding logic
            }

            if (state.currentOpenDropdown && state.currentOpenDropdown.trigger === clickedButton) {
                closeTimeDropdown();
            } else {
                createTimeDropdown(clickedButton);
            }
        });

        container.dataset.listenerAttached = 'true';
        console.log('DashboardFilters: Time Period filters initialized');
    }

    // ==================== CUSTOM PANEL FILTER COMPONENT ====================

    /**
     * Create DevExtreme TreeView DropDown for custom filters
     */
    function createCustomFilterDropdown(elementId, dataSource, placeholder) {
        const $element = $(elementId);
        if (!$element.length) return;

        const isHierarchical = Array.isArray(dataSource) && dataSource.some(item => item && typeof item === 'object' && item.items);
        const treeData = isHierarchical ? dataSource : dataSource.map(item => ({ id: item, text: item }));

        $element.dxDropDownBox({
            value: [],
            valueExpr: 'id',
            displayExpr: 'text',
            dataSource: treeData,
            placeholder: placeholder,
            showClearButton: true,
            showDropDownButton: true,

            dropDownOptions: {
                elementAttr: { class: 'otif-filter-popup-restyle' },
                container: 'body',
                width: function () {
                    const parentWidth = $element.outerWidth();
                    return parentWidth || 800;
                }
            },

            contentTemplate: function (e) {
                const dropDownBox = e.component;
                const $container = $('<div>');

                if (isHierarchical) {
                    const treeView = $container.dxTreeView({
                        dataSource: dropDownBox.getDataSource(),
                        keyExpr: 'id',
                        displayExpr: 'text',
                        dataStructure: 'tree',
                        selectByClick: true,
                        selectNodesRecursive: true,
                        searchEnabled: true,
                        searchMode: 'contains',
                        searchExpr: 'text',
                        searchEditorOptions: { placeholder: 'Search...' },
                        showCheckBoxesMode: 'normal',
                        selectionMode: 'multiple',
                        selectAllEnabled: true,
                        expandAllEnabled: false,
                        animationEnabled: true,

                        onContentReady: function (args) {
                            // Sync initial selection
                            const value = dropDownBox.option('value') || [];
                            if (value.includes('All') || value.includes('Select All')) {
                                args.component.selectAll();
                            } else {
                                args.component.unselectAll();
                                value.forEach(key => {
                                    try { args.component.selectItem(key); } catch (err) { }
                                });
                            }
                        },

                        onItemSelectionChanged: function (e) {
                            const component = e.component;
                            const dropDownBox = $element.dxDropDownBox('instance');

                            // Sync Logic (Only on user interaction)
                            if (e.event) {
                                const itemData = e.itemData;
                                const itemText = (typeof itemData === 'string' ? itemData : itemData.text);
                                const items = component.getDataSource().items();

                                if (itemText === 'All' || itemText === 'Select All') {
                                    if (e.node.selected) {
                                        component.selectAll();
                                    } else {
                                        component.unselectAll();
                                    }
                                } else {
                                    // Check if all other items are selected
                                    const valueItems = items.filter(i => {
                                        const t = (typeof i === 'string' ? i : i.text);
                                        return t !== 'All' && t !== 'Select All';
                                    });

                                    const selectedNodes = component.getSelectedNodes();
                                    const selectedTexts = selectedNodes.map(n => n.text || n.itemData);

                                    const allValuesSelected = valueItems.every(v => {
                                        const t = (typeof v === 'string' ? v : v.text);
                                        return selectedTexts.includes(t);
                                    });

                                    if (allValuesSelected) {
                                        const isAllSelected = selectedTexts.includes('All') || selectedTexts.includes('Select All');
                                        if (!isAllSelected) {
                                            try { component.selectItem('All'); } catch (err) { }
                                            try { component.selectItem('Select All'); } catch (err) { }
                                        }
                                    } else {
                                        const isAllSelected = selectedTexts.includes('All') || selectedTexts.includes('Select All');
                                        if (isAllSelected) {
                                            try { component.unselectItem('All'); } catch (err) { }
                                            try { component.unselectItem('Select All'); } catch (err) { }
                                        }
                                    }
                                }
                            }

                            // Update Value
                            const finalSelectedKeys = component.getSelectedNodeKeys();
                            if (finalSelectedKeys.includes('All') || finalSelectedKeys.includes('Select All')) {
                                dropDownBox.option("value", ['All']);
                            } else {
                                dropDownBox.option("value", finalSelectedKeys);
                            }
                        }

                    }).dxTreeView('instance');

                    dropDownBox.on('opened', () => {
                        const value = dropDownBox.option('value') || [];
                        if (value.includes('All') || value.includes('Select All')) {
                            treeView.selectAll();
                        } else {
                            treeView.unselectAll();
                            value.forEach(key => {
                                try { treeView.selectItem(key); } catch (err) { }
                            });
                        }
                    });

                    return $container;

                } else {
                    const list = $container.dxList({
                        dataSource: treeData,
                        keyExpr: "id",
                        displayExpr: "text",
                        selectionMode: "all",
                        showSelectionControls: true,
                        selectAllMode: "allPages",
                        selectAllText: "All",
                        searchEnabled: true,
                        searchExpr: "text",
                        onSelectionChanged: function (args) {
                            dropDownBox.option("value", args.component.option("selectedItemKeys"));
                        },
                        selectedItemKeys: dropDownBox.option("value") || []
                    }).dxList('instance');

                    dropDownBox.on('opened', () => {
                        list.option("selectedItemKeys", dropDownBox.option("value") || []);
                    });

                    return $container;
                }
            }
        });
    }

    /**
     * Render custom filters from configuration
     */
    function renderCustomFilters() {
        const container = document.querySelector(state.config.customFilters.containerSelector);
        if (!container) {
            console.warn('DashboardFilters: Custom filter container not found');
            return;
        }

        let html = '<div class="row g-2">';
        state.config.customFilters.filters.forEach(filter => {
            const width = filter.width || 6;
            html += `
                <div class="col-${width}">
                    <div class="filter-group">
                        <label class="form-label">${filter.label}</label>
                        <div class="otif-tree-filter" id="${filter.id}"
                             data-placeholder="${filter.placeholder}"
                             data-source-key="${filter.id}"></div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Initialize custom panel filters
     */
    /**
     * Initialize custom panel filters
     */
    function initCustomFilters() {
        if (typeof $ === 'undefined' || typeof $.fn.dxDropDownBox === 'undefined') {
            console.error('DashboardFilters: jQuery and DevExtreme are required for custom filters');
            return;
        }

        // Render filter HTML
        renderCustomFilters();

        // Initialize each filter
        state.config.customFilters.filters.forEach(filter => {
            const elementId = `#${filter.id}`;
            createCustomFilterDropdown(elementId, filter.dataSource, filter.placeholder);
        });

        console.log('DashboardFilters: Custom Panel filters initialized');
    }

    /**
     * Get custom filter values
     */
    function getCustomFilterValues() {
        const values = {};
        state.config.customFilters.filters.forEach(filter => {
            const instance = $(`#${filter.id}`).dxDropDownBox('instance');
            if (instance) {
                values[filter.id] = instance.option('value') || [];
            }
        });
        return values;
    }

    // ==================== CALENDAR COMPONENT ====================

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    /**
     * Render calendar grid
     */
    function renderCalendar() {
        const { currentYear, currentMonth, startDate, endDate, hoveredDate } = state.calendarState;

        const calendarConfig = state.config.calendar;
        const grid = document.querySelector(calendarConfig.gridSelector);
        const monthYearDisplay = document.querySelector(calendarConfig.monthYearDisplaySelector);
        if (!grid || !monthYearDisplay) return;

        grid.innerHTML = '';
        monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Empty days before month starts
        for (let i = 0; i < firstDay; i++) {
            grid.insertAdjacentHTML('beforeend', '<div class="calendar-day not-current-month"></div>');
        }

        const startDateTime = startDate ? startDate.getTime() : null;
        let effectiveEndDate = endDate;
        if (startDate && !endDate && hoveredDate) {
            effectiveEndDate = hoveredDate;
        }
        const effectiveEndDateTime = effectiveEndDate ? effectiveEndDate.getTime() : null;

        const today = new Date();
        const todayTime = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).getTime();

        for (let i = 1; i <= daysInMonth; i++) {
            const day = document.createElement('div');
            const currentDate = new Date(Date.UTC(currentYear, currentMonth, i));
            const currentTime = currentDate.getTime();

            day.className = 'calendar-day';
            day.textContent = i;
            day.dataset.date = currentDate.toISOString().split('T')[0];

            if (currentTime === todayTime) {
                day.classList.add('today');
            }

            if (startDateTime && effectiveEndDateTime) {
                const rangeStart = Math.min(startDateTime, effectiveEndDateTime);
                const rangeEnd = Math.max(startDateTime, effectiveEndDateTime);

                if (currentTime > rangeStart && currentTime < rangeEnd) {
                    day.classList.add('in-range');
                }
                if (currentTime === startDateTime) {
                    day.classList.add(startDateTime === effectiveEndDateTime ? 'selected-end' : 'selected-start');
                }
                if (currentTime === effectiveEndDateTime) {
                    day.classList.add('selected-end');
                }
            } else if (startDateTime && currentTime === startDateTime) {
                day.classList.add('selected-start', 'selected-end');
            }

            day.addEventListener('click', handleCalendarDayClick);
            grid.appendChild(day);
        }
        updateDateRangeDisplay();
    }

    /**
     * Handle calendar day click
     */
    function handleCalendarDayClick(event) {
        const selectedDateStr = event.target.dataset.date;
        if (!selectedDateStr) return;

        const [year, month, day] = selectedDateStr.split('-').map(Number);
        const clickedDate = new Date(Date.UTC(year, month - 1, day));

        const { startDate, endDate } = state.calendarState;

        state.calendarState.hoveredDate = null;

        if (!startDate || (startDate && endDate)) {
            state.calendarState.startDate = clickedDate;
            state.calendarState.endDate = null;
        } else {
            if (clickedDate < startDate) {
                state.calendarState.endDate = startDate;
                state.calendarState.startDate = clickedDate;
            } else {
                state.calendarState.endDate = clickedDate;
            }
        }

        // Enable Time Period filter (disables Moving Average)
        enableTimePeriodFilter();

        // Clear time period filters (mutual exclusivity)
        state.activeFilters.timeSelection = [];
        state.activeFilters.timeSelectionCategory = null;
        const container = document.querySelector(state.config.timeFilters.containerSelector);
        if (container) {
            container.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        }

        renderCalendar();
        triggerFilterChange();
    }

    /**
     * Handle calendar day hover
     */
    function handleCalendarDayHover(event) {
        const dayElement = event.target.closest('.calendar-day');
        if (state.calendarState.startDate && !state.calendarState.endDate && dayElement && dayElement.dataset.date) {
            const [year, month, day] = dayElement.dataset.date.split('-').map(Number);
            const hovered = new Date(Date.UTC(year, month - 1, day));
            if (state.calendarState.hoveredDate && state.calendarState.hoveredDate.getTime() === hovered.getTime()) {
                return;
            }
            state.calendarState.hoveredDate = hovered;
            renderCalendar();
        }
    }

    /**
     * Handle calendar grid mouse leave
     */
    function handleCalendarGridMouseLeave() {
        if (state.calendarState.hoveredDate) {
            state.calendarState.hoveredDate = null;
            renderCalendar();
        }
    }

    /**
     * Update date range display
     */
    function updateDateRangeDisplay() {
        const calendarConfig = state.config.calendar;
        const fromDateEl = document.querySelector(calendarConfig.fromDateSelector);
        const toDateEl = document.querySelector(calendarConfig.toDateSelector);

        if (!fromDateEl || !toDateEl) return;

        const { startDate, endDate } = state.calendarState;

        const formatDate = (date) => {
            if (!date) return '--';
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
        };

        fromDateEl.textContent = formatDate(startDate);
        toDateEl.textContent = formatDate(endDate || startDate);
    }

    /**
     * Navigate calendar month
     */
    function navigateCalendarMonth(direction) {
        if (direction === 'prev') {
            state.calendarState.currentMonth--;
            if (state.calendarState.currentMonth < 0) {
                state.calendarState.currentMonth = 11;
                state.calendarState.currentYear--;
            }
        } else if (direction === 'next') {
            state.calendarState.currentMonth++;
            if (state.calendarState.currentMonth > 11) {
                state.calendarState.currentMonth = 0;
                state.calendarState.currentYear++;
            }
        }
        renderCalendar();
    }

    /**
     * Toggle Month/Year Picker Overlay
     */
    function togglePickerOverlay(show) {
        const overlay = document.getElementById('month-year-picker-overlay');
        if (!overlay) return;

        if (show) {
            // Init temp state from current
            state.calendarState.pickerMonth = state.calendarState.currentMonth;
            state.calendarState.pickerYear = state.calendarState.currentYear;
            renderPickerColumns();
            overlay.classList.remove('d-none');
            scrollToPickerSelection();
        } else {
            overlay.classList.add('d-none');
        }
    }

    /**
     * Render Picker Columns
     */
    function renderPickerColumns() {
        const monthCol = document.getElementById('picker-month-column');
        const yearCol = document.getElementById('picker-year-column');
        if (!monthCol || !yearCol) return;

        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentYear = new Date().getFullYear();
        const yearRange = 10; // +/- 5 years or so

        // Render Months
        monthCol.innerHTML = months.map((m, i) => `
            <div class="picker-item ${i === state.calendarState.pickerMonth ? 'selected' : ''}" 
                 data-type="month" data-value="${i}">
                ${m}
            </div>
        `).join('');

        // Render Years (From 2020 to current + 5)
        const startYear = 2020;
        const endYear = currentYear + 5;
        let yearsHtml = '';
        for (let y = startYear; y <= endYear; y++) {
            yearsHtml += `
                <div class="picker-item ${y === state.calendarState.pickerYear ? 'selected' : ''}" 
                     data-type="year" data-value="${y}">
                    ${y}
                </div>
            `;
        }
        yearCol.innerHTML = yearsHtml;

        // Attach click listeners
        monthCol.querySelectorAll('.picker-item').forEach(item => {
            item.addEventListener('click', () => handlePickerSelection('month', parseInt(item.dataset.value)));
        });
        yearCol.querySelectorAll('.picker-item').forEach(item => {
            item.addEventListener('click', () => handlePickerSelection('year', parseInt(item.dataset.value)));
        });
    }

    /**
     * Handle picker selection click
     */
    function handlePickerSelection(type, value) {
        if (type === 'month') {
            state.calendarState.pickerMonth = value;
        } else {
            state.calendarState.pickerYear = value;
        }
        // Re-render to update selected class
        renderPickerColumns();
        // Scroll the selected item to center
        scrollToPickerSelection();
    }

    /**
     * Scroll to selected items
     */
    function scrollToPickerSelection() {
        // Simple timeout to allow layout
        setTimeout(() => {
            const monthCol = document.getElementById('picker-month-column');
            const yearCol = document.getElementById('picker-year-column');

            const selectedMonth = monthCol.querySelector('.picker-item.selected');
            const selectedYear = yearCol.querySelector('.picker-item.selected');

            if (selectedMonth) {
                selectedMonth.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (selectedYear) {
                selectedYear.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    }

    /**
     * Initialize calendar component
     */
    function initCalendar() {
        const calendarConfig = state.config.calendar;
        const grid = document.querySelector(calendarConfig.gridSelector);
        if (!grid) {
            console.warn('DashboardFilters: Calendar grid not found');
            return;
        }

        // Attach event listeners
        grid.addEventListener('mouseover', handleCalendarDayHover);
        grid.addEventListener('mouseleave', handleCalendarGridMouseLeave);

        // Attach navigation buttons using configurable selectors
        const prevBtn = document.querySelector(calendarConfig.prevButtonSelector);
        const nextBtn = document.querySelector(calendarConfig.nextButtonSelector);
        const todayBtn = document.querySelector(calendarConfig.todayButtonSelector);

        if (prevBtn) prevBtn.addEventListener('click', () => navigateCalendarMonth('prev'));
        if (nextBtn) nextBtn.addEventListener('click', () => navigateCalendarMonth('next'));
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                const today = new Date();
                state.calendarState.currentYear = today.getFullYear();
                state.calendarState.currentMonth = today.getMonth();
                renderCalendar();
            });
        }

        // Month/Year Trigger
        const monthYearSelector = document.getElementById('month-year-selector');
        if (monthYearSelector) {
            monthYearSelector.addEventListener('click', () => togglePickerOverlay(true));
        }

        // Picker Done Button
        const pickerDoneBtn = document.getElementById('picker-done-btn');
        if (pickerDoneBtn) {
            pickerDoneBtn.addEventListener('click', () => {
                state.calendarState.currentMonth = state.calendarState.pickerMonth;
                state.calendarState.currentYear = state.calendarState.pickerYear;
                renderCalendar();
                togglePickerOverlay(false);
            });
        }

        // Initial render
        renderCalendar();

        console.log('DashboardFilters: Calendar initialized');
    }

    // ==================== FILTER PANEL MANAGEMENT ====================

    /**
     * Initialize filter panel (toggle, close, apply, reset buttons)
     */
    function initFilterPanel() {
        const panelConfig = state.config.filterPanel;
        const panel = document.querySelector(panelConfig.panelSelector);

        if (!panel) {
            console.warn('DashboardFilters: Filter panel not found');
            return;
        }

        // Get the main dashboard content for blur effect
        const dashboardContent = document.querySelector(state.config.container);
        const blurClass = 'dashboard-content-blur';

        // Helper function to toggle blur
        const toggleBlur = (shouldBlur) => {
            if (dashboardContent) {
                if (shouldBlur) {
                    dashboardContent.classList.add(blurClass);
                } else {
                    dashboardContent.classList.remove(blurClass);
                }
            }
        };

        // Toggle button
        const toggleBtn = document.querySelector(panelConfig.toggleButtonSelector);
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = panel.classList.contains(panelConfig.hiddenClass);
                panel.classList.toggle(panelConfig.hiddenClass);
                // If panel was hidden and now visible, add blur; otherwise remove blur
                toggleBlur(isHidden);
            });
        }

        // Close button
        const closeBtn = document.querySelector(panelConfig.closeButtonSelector);
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                panel.classList.add(panelConfig.hiddenClass);
                toggleBlur(false);
            });
        }

        // Apply button
        const applyBtn = document.querySelector(panelConfig.applyButtonSelector);
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                panel.classList.add(panelConfig.hiddenClass);
                toggleBlur(false);
                triggerFilterChange();
            });
        }

        // Reset button
        const resetBtn = document.querySelector(panelConfig.resetButtonSelector);
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                // Reset calendar state
                state.calendarState.startDate = null;
                state.calendarState.endDate = null;
                state.calendarState.hoveredDate = null;
                state.calendarState.currentYear = new Date().getFullYear();
                state.calendarState.currentMonth = new Date().getMonth();

                // Reset time filters
                state.activeFilters.timeSelection = [];
                state.activeFilters.timeSelectionCategory = null;
                const timeContainer = document.querySelector(state.config.timeFilters.containerSelector);
                if (timeContainer) {
                    timeContainer.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
                }

                // Reset custom filters (DevExtreme dropdowns)
                if (typeof $ !== 'undefined') {
                    state.config.customFilters.filters.forEach(filter => {
                        const instance = $(`#${filter.id}`).dxDropDownBox('instance');
                        if (instance) {
                            instance.option('value', []);
                        }
                    });
                }
                state.activeFilters.customFilters = {};

                // Clear filter mutual exclusion restrictions
                clearFilterRestrictions();

                // Re-render calendar
                renderCalendar();

                console.log('DashboardFilters: Filters reset');
            });
        }

        state.filterPanelInitialized = true;
        console.log('DashboardFilters: Filter Panel initialized');
    }

    // ==================== PUBLIC API ====================

    return {
        /**
         * Initialize the filter utility
         * @param {Object} config - Configuration object
         * @returns {Object} - DashboardFilters for chaining
         */
        init: function (config) {
            if (state.initialized) {
                console.warn('DashboardFilters: Already initialized');
                return this;
            }

            state.config = mergeConfig(config);

            // Initialize Moving Average
            if (state.config.movingAverage.enabled) {
                initMovingAverage();
            }

            // Initialize Time Period Filters
            if (state.config.timeFilters.enabled) {
                initTimeFilters();
            }

            // Initialize Custom Panel Filters
            if (state.config.customFilters.enabled && state.config.customFilters.filters.length > 0) {
                initCustomFilters();
            }

            // Initialize Calendar
            if (state.config.calendar.enabled) {
                initCalendar();
            }

            // Initialize Filter Panel Management
            if (state.config.filterPanel.enabled) {
                initFilterPanel();
            }

            state.initialized = true;

            // Determine default active filter state
            if (state.config.movingAverage.enabled) {
                // If MA is enabled, make it active by default (enforces mutual exclusion)
                enableMovingAverageFilter();
            } else if (state.config.timeFilters.enabled) {
                // Otherwise default to Time Period
                enableTimePeriodFilter();
            }

            // Final check to ensure UI is consistent and chips are displayed
            triggerFilterChange();

            // Initialize filter status banner with current state
            updateFilterStatusBanner();

            console.log('DashboardFilters: Initialized successfully');

            return this;
        },

        /**
         * Apply Moving Average to a chart
         * @param {Chart} chartInstance - Chart.js instance
         * @param {Object} options - MA options
         * @returns {Object} - DashboardFilters for chaining
         */
        applyMAToChart: function (chartInstance, options = {}) {
            if (!chartInstance || !chartInstance.data) {
                console.error('DashboardFilters: Invalid chart instance');
                return this;
            }

            const chartId = chartInstance.canvas.id || `chart-${Date.now()}`;

            const mainDataset = chartInstance.data.datasets.find(ds =>
                !ds.label || !ds.label.includes('MA')
            );

            if (!mainDataset || !mainDataset.data) {
                console.error('DashboardFilters: No data found in chart');
                return this;
            }

            const originalData = [...mainDataset.data];
            const originalDatasets = chartInstance.data.datasets.map(ds => [...ds.data]);
            const originalLabels = chartInstance.data.labels ? [...chartInstance.data.labels] : null;

            const period = options.period || state.config.movingAverage.period;
            const maData = calculateSMA(originalData, period);

            const currentWeek = state.movingAverage.currentWeek;
            const startWeek = currentWeek <= period ? 0 : currentWeek - period;

            state.movingAverage.enabledCharts.set(chartId, {
                instance: chartInstance,
                options: options,
                originalData: originalData,
                originalDatasets: originalDatasets,
                originalLabels: originalLabels
            });

            addMADatasetToChart(chartInstance, maData, options, startWeek, currentWeek);

            return this;
        },

        /**
         * Get current filter values
         * @returns {Object} - All filter values
         */
        getFilters: function () {
            return collectAllFilters();
        },

        /**
         * Get Moving Average state
         * @returns {Object} - MA state
         */
        getMAState: function () {
            return {
                currentWeek: state.movingAverage.currentWeek,
                period: state.movingAverage.currentPeriod,
                type: state.movingAverage.type
            };
        },

        /**
         * Set filter values programmatically
         * @param {Object} filters - Filter values
         * @returns {Object} - DashboardFilters for chaining
         */
        setFilters: function (filters) {
            if (!state.initialized) {
                console.error('DashboardFilters: Not initialized');
                return this;
            }

            if (filters.timeSelection !== undefined) {
                state.activeFilters.timeSelection = filters.timeSelection;
                state.activeFilters.timeSelectionCategory = filters.timeSelectionCategory;
            }

            if (filters.startDate !== undefined) {
                state.calendarState.startDate = filters.startDate;
            }

            if (filters.endDate !== undefined) {
                state.calendarState.endDate = filters.endDate;
            }

            if (filters.customFilters !== undefined) {
                state.activeFilters.customFilters = { ...filters.customFilters };
            }

            return this;
        },

        /**
         * Clear Moving Average selection and re-enable Time Period filters
         * @returns {Object} - DashboardFilters for chaining
         */
        clearMovingAverage: function () {
            if (!state.initialized) {
                console.error('DashboardFilters: Not initialized');
                return this;
            }

            // Reset MA to default week (Dynamic Current Week)
            state.movingAverage.currentWeek = currentWeekNum;

            // Clear search input and reset list visibility
            const searchInput = document.getElementById('maSearchInput');
            if (searchInput) {
                searchInput.value = '';
                // Trigger input event to reset visibility or manually reset
                const weekOptions = document.querySelectorAll('.ma-week-option');
                weekOptions.forEach(option => {
                    option.classList.remove('hidden');
                    option.parentElement.style.display = '';
                    option.classList.remove('active'); // Remove active from all
                });
            }

            // Set default item as active (assuming the first item is the default 'last 13-week')
            const defaultItem = document.querySelector('.otif-ma-dropdown-menu .dropdown-item[data-ma-type="full"]');
            if (defaultItem) defaultItem.classList.add('active');


            // Clear filter restrictions - re-enable Time Period filters
            clearFilterRestrictions();

            // Update MA button text to default
            updateMAButtonText();

            // Update charts if any are enabled
            updateAllMACharts();

            // Trigger filter change
            triggerFilterChange();

            console.log('DashboardFilters: Moving Average cleared');
            return this;
        },

        /**
         * Reset all filters
         * @returns {Object} - DashboardFilters for chaining
         */
        reset: function () {
            if (!state.initialized) {
                console.error('DashboardFilters: Not initialized');
                return this;
            }

            state.activeFilters.timeSelection = [];
            state.activeFilters.timeSelectionCategory = null;
            state.activeFilters.customFilters = {};
            state.calendarState.startDate = null;
            state.calendarState.endDate = null;
            state.calendarState.hoveredDate = null;

            // Clear filter mutual exclusion restrictions
            clearFilterRestrictions();

            triggerFilterChange();

            return this;
        },

        /**
         * Calculate SMA (exposed for external use)
         * @param {Array} data - Data array
         * @param {Number} period - MA period
         * @returns {Array} - MA data
         */
        calculateSMA: function (data, period) {
            return calculateSMA(data, period);
        },

        /**
         * Get current state for debugging
         * @returns {Object} - Current state
         */
        getState: function () {
            return {
                initialized: state.initialized,
                movingAverage: { ...state.movingAverage },
                activeFilters: { ...state.activeFilters },
                calendarState: { ...state.calendarState }
            };
        },

        /**
         * Update filter display chips beside title
         * @returns {Object} - DashboardFilters for chaining
         */
        updateFilterDisplay: function () {
            updateFilterDisplay();
            return this;
        },

        /**
         * Clear Time Period Filters (exposed)
         */
        clearTimeFilters: function () {
            clearTimeFilters();
            return this;
        },

        /**
         * Clear Custom Filter (exposed)
         */
        clearCustomFilter: function (filterId) {
            clearCustomFilter(filterId);
            return this;
        }
    };
})();

// Expose globally
if (typeof window !== 'undefined') {
    window.DashboardFilters = DashboardFilters;
}
