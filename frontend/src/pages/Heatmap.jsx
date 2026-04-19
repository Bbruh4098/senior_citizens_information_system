import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Spin, Typography, Row, Col, Statistic, Alert, Checkbox, Popover, Empty, Input, InputNumber, Button, Divider, Space, Tag, Tooltip } from 'antd';
import { TeamOutlined, ManOutlined, WomanOutlined, HeartOutlined, HeatMapOutlined, UserOutlined } from '@ant-design/icons';
import { FilterOutlined, FilterFilled, SearchOutlined, CloseOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { dashboardApi } from '../services/api';
import 'leaflet/dist/leaflet.css';

const { Title, Text } = Typography;

// Name mapping: DB name → GeoJSON NAME_3 (handles mismatches)
const NAME_MAP = {
    'Calarian_Southcom': 'Calarian',
    'Canelar_Camins': 'Canelar',
    'San Jose Gusu_Suterville': 'San Jose Gusu',
    'Talabaan_Gapuh': 'Talabaan',
    'Dulian (Upper Bunguiao)': 'Dulian',
    'Dulian (Lower Pasonanca)': 'Dulian',
    'Latuan (Curuan)': 'Latuan',
    'Sibulao (Caruan)': 'Sibulao',
    'Pasilmanta (Sacol Island)': 'Pasilmanta',
    'Santo Ni\u00f1o': 'Santo Ni\u00f1o',
    'Santo Ni?o': 'Santo Ni\u00f1o',
    'Ayalo': 'Ayala',
    'Sinunuc': 'Sinunoc',
    'Zone I (Poblacion)': 'Barangay Zone I',
    'Zone II (Poblacion)': 'Barangay Zone II',
    'Zone III (Poblacion)': 'Barangay Zone III',
    'Zone IV (Poblacion)': 'Barangay Zone IV',
};

const AGE_OPTIONS = [
    { value: 'age_60_69', label: 'Sexagenarians (60-69)' },
    { value: 'age_70_79', label: 'Septuagenarians (70-79)' },
    { value: 'age_80_89', label: 'Octogenarians (80-89)' },
    { value: 'age_90_99', label: 'Nonagenarians (90-99)' },
    { value: 'centenarian', label: 'Centenarians (100+)' },
];

const STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'deceased', label: 'Deceased' },
];

const ColumnFilterPopover = ({ title, options, selected, onChange, labelKey = 'label', valueKey = 'value' }) => {
    const [search, setSearch] = useState('');
    const [tempSelected, setTempSelected] = useState(selected || []);
    const [open, setOpen] = useState(false);

    const filtered = options.filter((o) => {
        const label = typeof o === 'string' ? o : o[labelKey];
        return label?.toLowerCase().includes(search.toLowerCase());
    });

    const allValues = filtered.map((o) => (typeof o === 'string' ? o : o[valueKey]));
    const allSelected = allValues.length > 0 && allValues.every((v) => tempSelected.includes(v));

    const handleApply = () => {
        onChange(tempSelected);
        setOpen(false);
    };

    const handleClear = () => {
        setTempSelected([]);
    };

    const handleSelectAll = () => {
        if (allSelected) {
            setTempSelected(tempSelected.filter((v) => !allValues.includes(v)));
        } else {
            const merged = [...new Set([...tempSelected, ...allValues])];
            setTempSelected(merged);
        }
    };

    const handleToggle = (value) => {
        setTempSelected((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
    };

    const isActive = selected && selected.length > 0;

    const content = (
        <div style={{ width: 250 }}>
            <Input
                placeholder={`Search ${title}...`}
                prefix={<SearchOutlined />}
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ marginBottom: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Button type="link" size="small" onClick={handleSelectAll} style={{ padding: 0 }}>
                    {allSelected ? 'Deselect All' : 'Select All'}
                </Button>
                <Button type="link" size="small" onClick={handleClear} style={{ padding: 0 }} danger>
                    Clear
                </Button>
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto', borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
                {filtered.length === 0 ? (
                    <Empty description="No options" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0' }} />
                ) : (
                    filtered.map((option) => {
                        const label = typeof option === 'string' ? option : option[labelKey];
                        const value = typeof option === 'string' ? option : option[valueKey];
                        return (
                            <div
                                key={value}
                                style={{ padding: '4px 0', cursor: 'pointer' }}
                                onClick={() => handleToggle(value)}
                            >
                                <Checkbox checked={tempSelected.includes(value)}>
                                    <Text style={{ fontSize: 13 }}>{label}</Text>
                                </Checkbox>
                            </div>
                        );
                    })
                )}
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button size="small" onClick={() => { setTempSelected(selected || []); setOpen(false); }}>
                    Cancel
                </Button>
                <Button type="primary" size="small" onClick={handleApply}>
                    Apply
                </Button>
            </div>
        </div>
    );

    return (
        <Popover
            content={content}
            trigger="click"
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (v) {
                    setTempSelected(selected || []);
                    setSearch('');
                }
            }}
            placement="bottomLeft"
        >
            <Tooltip title={`Filter by ${title}`}>
                {isActive ? (
                    <FilterFilled style={{ color: '#1890ff', cursor: 'pointer', marginLeft: 4 }} />
                ) : (
                    <FilterOutlined style={{ color: '#bfbfbf', cursor: 'pointer', marginLeft: 4 }} />
                )}
            </Tooltip>
        </Popover>
    );
};

// Color from value: green (low) → yellow → orange → red (high)
const getColor = (value, max) => {
    if (!max || !value) return '#e8f5e9';
    const ratio = Math.min(value / max, 1);
    if (ratio < 0.25) return '#a5d6a7';
    if (ratio < 0.5) return '#fff176';
    if (ratio < 0.75) return '#ffb74d';
    return '#ef5350';
};

const getColorForLegend = (level) => {
    if (level === 0) return '#e8f5e9';
    if (level === 1) return '#a5d6a7';
    if (level === 2) return '#fff176';
    if (level === 3) return '#ffb74d';
    return '#ef5350';
};

// Legend component inside the map
const Legend = ({ max, filterLabel }) => {
    const map = useMap();
    const legendRef = useRef(null);

    useEffect(() => {
        if (!legendRef.current) return;
        const L = window.L || map._leaflet_id && window.L;
        if (!L) return;
        L.DomEvent.disableClickPropagation(legendRef.current);
        L.DomEvent.disableScrollPropagation(legendRef.current);
    }, [map]);

    return (
        <div
            ref={legendRef}
            style={{
                position: 'absolute', bottom: 20, right: 20, zIndex: 1000,
                background: 'rgba(255,255,255,0.95)', padding: '12px 16px',
                borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                minWidth: 140, backdropFilter: 'blur(4px)',
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: '#333' }}>
                {filterLabel}
            </div>
            {[
                { color: getColorForLegend(0), label: '0' },
                { color: getColorForLegend(1), label: `1 – ${Math.round(max * 0.25)}` },
                { color: getColorForLegend(2), label: `${Math.round(max * 0.25) + 1} – ${Math.round(max * 0.5)}` },
                { color: getColorForLegend(3), label: `${Math.round(max * 0.5) + 1} – ${Math.round(max * 0.75)}` },
                { color: getColorForLegend(4), label: `${Math.round(max * 0.75) + 1} – ${max}` },
            ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{
                        width: 18, height: 14, background: item.color,
                        border: '1px solid #ccc', borderRadius: 2,
                    }} />
                    <span style={{ fontSize: 11, color: '#555' }}>{item.label}</span>
                </div>
            ))}
        </div>
    );
};

// Fit map bounds to GeoJSON
const FitBounds = ({ geoData }) => {
    const map = useMap();
    useEffect(() => {
        if (geoData && geoData.features.length > 0) {
            const L = window.L;
            if (L) {
                const layer = L.geoJSON(geoData);
                map.fitBounds(layer.getBounds(), { padding: [20, 20] });
            }
        }
    }, [geoData, map]);
    return null;
};

const Heatmap = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [apiData, setApiData] = useState(null);
    const [geoData, setGeoData] = useState(null);
    const [geoDataCached, setGeoDataCached] = useState(null);
    const geoJsonRef = useRef(null);

    // Combo filter state (Excel-style multi-select)
    const [statusFilter, setStatusFilter] = useState(['active']);
    const [genderFilter, setGenderFilter] = useState([]);
    const [ageFilter, setAgeFilter] = useState([]);
    const [districtFilter, setDistrictFilter] = useState([]);
    const [barangayFilter, setBarangayFilter] = useState([]);
    const [minAgeFilter, setMinAgeFilter] = useState(null);
    const [maxAgeFilter, setMaxAgeFilter] = useState(null);

    // Fetch data from API with current filters
    const fetchData = useCallback(async (status, genderId, ageCategory, districts, barangays, minAge, maxAge) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                status: status?.length ? status.join(',') : undefined,
                gender_id: genderId?.length ? genderId.join(',') : undefined,
                age_category: ageCategory?.length ? ageCategory.join(',') : undefined,
                district: districts?.length ? districts.join(',') : undefined,
                barangay_ids: barangays?.length ? barangays.join(',') : undefined,
                min_age: minAge ?? undefined,
                max_age: maxAge ?? undefined,
            };
            const promises = [dashboardApi.getHeatmapData(params)];
            // Only fetch GeoJSON once
            if (!geoDataCached) {
                promises.push(fetch('/data/zamboanga_barangays.json').then(r => r.json()));
            }
            const results = await Promise.all(promises);
            setApiData(results[0].data.data);
            if (results[1]) {
                setGeoData(results[1]);
                setGeoDataCached(results[1]);
            }
        } catch (err) {
            console.error('Heatmap data fetch error:', err);
            setError(err.response?.data?.message || 'Failed to load heatmap data');
        } finally {
            setLoading(false);
        }
    }, [geoDataCached]);

    // Re-fetch when any filter changes
    useEffect(() => {
        fetchData(statusFilter, genderFilter, ageFilter, districtFilter, barangayFilter, minAgeFilter, maxAgeFilter);
    }, [statusFilter, genderFilter, ageFilter, districtFilter, barangayFilter, minAgeFilter, maxAgeFilter, fetchData]);

    // Use cached geo data
    const geo = geoData || geoDataCached;

    // Build current filter label
    const filterLabel = useMemo(() => {
        const parts = [];

        const statusLabels = STATUS_OPTIONS
            .filter((o) => statusFilter.includes(o.value))
            .map((o) => o.label);
        if (statusLabels.length > 0 && statusLabels.length < STATUS_OPTIONS.length) {
            parts.push(`Status: ${statusLabels.join(', ')}`);
        }

        const genderLabels = (apiData?.genders || [])
            .filter((g) => genderFilter.includes(g.id))
            .map((g) => g.name);
        if (genderLabels.length > 0) {
            parts.push(`Gender: ${genderLabels.join(', ')}`);
        }

        const ageLabels = AGE_OPTIONS
            .filter((o) => ageFilter.includes(o.value))
            .map((o) => o.label);
        if (ageLabels.length > 0) {
            parts.push(`Age: ${ageLabels.join(', ')}`);
        }

        if (minAgeFilter !== null || maxAgeFilter !== null) {
            const min = minAgeFilter !== null ? minAgeFilter : 60;
            const max = maxAgeFilter !== null ? maxAgeFilter : 'up';
            parts.push(`Age Range: ${min} - ${max}`);
        }

        if (districtFilter.length > 0) {
            parts.push(`District: ${districtFilter.join(', ')}`);
        }

        const barangayLabels = (apiData?.distribution || [])
            .filter((b) => barangayFilter.includes(b.barangay_id))
            .map((b) => b.name);
        if (barangayLabels.length > 0) {
            parts.push(`Barangay: ${barangayLabels.join(', ')}`);
        }

        if (parts.length === 0) return 'All Seniors';
        return parts.join(' • ');
    }, [statusFilter, genderFilter, ageFilter, districtFilter, barangayFilter, minAgeFilter, maxAgeFilter, apiData]);

    const districtOptions = useMemo(() => {
        const unique = [...new Set((apiData?.distribution || []).map((b) => b.district).filter(Boolean))];
        return unique.sort().map((d) => ({ label: d, value: d }));
    }, [apiData]);

    const barangayOptions = useMemo(() => {
        return (apiData?.distribution || [])
            .map((b) => ({ label: b.name, value: b.barangay_id }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [apiData]);

    // Map DB name → data lookup
    const dataLookup = useMemo(() => {
        if (!apiData) return {};
        const lookup = {};
        apiData.distribution.forEach(brgy => {
            const dbName = brgy.name.trim();
            const geoName = NAME_MAP[dbName] || dbName;
            lookup[geoName.toLowerCase()] = brgy;
        });
        return lookup;
    }, [apiData]);

    // Max filtered count
    const maxValue = useMemo(() => {
        if (!apiData) return 0;
        return Math.max(...apiData.distribution.map(b => b.count || 0), 1);
    }, [apiData]);

    // Summary stats
    const summaryStats = useMemo(() => {
        if (!apiData) return {};
        const dist = apiData.distribution;
        const filtered = dist.reduce((sum, b) => sum + (b.count || 0), 0);
        const total = dist.reduce((sum, b) => sum + (b.total || 0), 0);
        const withData = dist.filter(b => (b.count || 0) > 0).length;
        const max = Math.max(...dist.map(b => b.count || 0));
        const topBarangay = dist.find(b => (b.count || 0) === max);
        return { filtered, total, barangaysWithData: withData, max, topBarangay };
    }, [apiData]);

    // Style function
    const getStyle = (feature) => {
        const name = (feature.properties.NAME_3 || feature.properties.NAME || '').toLowerCase();
        const data = dataLookup[name];
        const value = data ? (data.count || 0) : 0;
        return {
            fillColor: getColor(value, maxValue),
            weight: 1.5, opacity: 1, color: '#ffffff', fillOpacity: 0.75,
        };
    };

    // Popup + tooltip for each feature
    const onEachFeature = (feature, layer) => {
        const name = (feature.properties.NAME_3 || feature.properties.NAME || '');
        const data = dataLookup[name.toLowerCase()];

        const count = data ? (data.count || 0) : 0;
        layer.bindTooltip(
            `<div style="font-weight:600;margin-bottom:2px">${data?.name || name}</div>` +
            `<div>Matched: <strong>${count}</strong> / ${data?.total || 0}</div>`,
            { sticky: true, direction: 'top', className: 'heatmap-tooltip' }
        );

        if (data) {
            // Dynamic gender rows
            const genderRows = (apiData?.genders || [])
                .map(g => `<tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">${g.name}</td><td style="text-align:right;font-weight:600">${data[g.key] || 0}</td></tr>`)
                .join('');

            layer.bindPopup(`
                <div style="min-width:180px">
                    <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#1a1a2e">${data.name}</div>
                    <div style="color:#666;font-size:11px;margin-bottom:8px">${data.district}</div>
                    <table style="width:100%;font-size:12px;border-collapse:collapse">
                        <tr style="border-bottom:2px solid #ddd"><td style="padding:3px 0;font-weight:700">Total</td><td style="text-align:right;font-weight:700">${data.total}</td></tr>
                        ${genderRows}
                        <tr style="border-top:2px solid #ddd"><td colspan="2" style="padding:6px 0 2px;font-weight:600;color:#555">Age Groups</td></tr>
                        <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">60-69</td><td style="text-align:right">${data.age_60_69}</td></tr>
                        <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">70-79</td><td style="text-align:right">${data.age_70_79}</td></tr>
                        <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">80-89</td><td style="text-align:right">${data.age_80_89}</td></tr>
                        <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">90-99</td><td style="text-align:right">${data.age_90_99}</td></tr>
                        <tr><td style="padding:3px 0">100+</td><td style="text-align:right;font-weight:600;color:#e53935">${data.centenarian}</td></tr>
                    </table>
                    ${count !== data.total ? `<div style="margin-top:8px;padding-top:6px;border-top:2px solid #1890ff;font-size:12px;color:#1890ff;font-weight:600">Filtered: ${count}</div>` : ''}
                </div>
            `);
        }

        layer.on({
            mouseover: (e) => {
                e.target.setStyle({ weight: 3, color: '#333', fillOpacity: 0.9 });
                e.target.bringToFront();
            },
            mouseout: (e) => {
                e.target.setStyle({ weight: 1.5, color: '#ffffff', fillOpacity: 0.75 });
            },
        });
    };

    const geoJsonKey = useMemo(
        () => `${statusFilter.join('|')}-${genderFilter.join('|')}-${ageFilter.join('|')}-${districtFilter.join('|')}-${barangayFilter.join('|')}-${maxValue}`,
        [statusFilter, genderFilter, ageFilter, districtFilter, barangayFilter, maxValue]
    );

    const hasActiveFilters =
        statusFilter.length !== 1 || statusFilter[0] !== 'all' ||
        genderFilter.length > 0 ||
        ageFilter.length > 0 ||
        districtFilter.length > 0 ||
        barangayFilter.length > 0 ||
        minAgeFilter !== null ||
        maxAgeFilter !== null;

    const clearAllFilters = () => {
        setStatusFilter(['all']);
        setGenderFilter([]);
        setAgeFilter([]);
        setDistrictFilter([]);
        setBarangayFilter([]);
        setMinAgeFilter(null);
        setMaxAgeFilter(null);
    };

    if (loading && !apiData) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
                <Spin size="large" tip="Loading heatmap data..." />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24 }}>
                <Alert type="error" message="Error Loading Heatmap" description={error} showIcon />
            </div>
        );
    }

    return (
        <div style={{ padding: '0 2px', maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HeatMapOutlined /> Senior Citizens Distribution Map
                </Title>
                <Text type="secondary">
                    Zamboanga City — combine filters to view specific demographics
                </Text>
            </div>

            {/* Filter Bar */}
            <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col>
                        <Space size={4}>
                            <Text strong>Status</Text>
                            <ColumnFilterPopover
                                title="Status"
                                options={STATUS_OPTIONS}
                                selected={statusFilter}
                                onChange={setStatusFilter}
                            />
                        </Space>
                    </Col>
                    <Col>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {statusFilter.length === 0 ? 'All' : STATUS_OPTIONS.filter((o) => statusFilter.includes(o.value)).map((o) => o.label).join(', ')}
                        </Text>
                    </Col>
                    <Col>
                        <Space size={4}>
                            <Text strong>Gender</Text>
                            <ColumnFilterPopover
                                title="Gender"
                                options={(apiData?.genders || []).map((g) => ({ label: g.name, value: g.id }))}
                                selected={genderFilter}
                                onChange={setGenderFilter}
                            />
                        </Space>
                    </Col>
                    <Col>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {genderFilter.length === 0 ? 'All' : (apiData?.genders || []).filter((g) => genderFilter.includes(g.id)).map((g) => g.name).join(', ')}
                        </Text>
                    </Col>
                    <Col>
                        <Space size={4}>
                            <Text strong>Age Group</Text>
                            <ColumnFilterPopover
                                title="Age Group"
                                options={AGE_OPTIONS}
                                selected={ageFilter}
                                onChange={setAgeFilter}
                            />
                        </Space>
                    </Col>
                    <Col>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {ageFilter.length === 0 ? 'All' : AGE_OPTIONS.filter((o) => ageFilter.includes(o.value)).map((o) => o.label).join(', ')}
                        </Text>
                    </Col>
                    <Col>
                        <Text strong>Age Range</Text>
                    </Col>
                    <Col>
                        <Space.Compact>
                            <InputNumber
                                placeholder="Min"
                                min={0}
                                max={150}
                                value={minAgeFilter}
                                onChange={setMinAgeFilter}
                                style={{ width: 90 }}
                            />
                            <InputNumber
                                placeholder="Max"
                                min={0}
                                max={150}
                                value={maxAgeFilter}
                                onChange={setMaxAgeFilter}
                                style={{ width: 90 }}
                            />
                        </Space.Compact>
                    </Col>
                    <Col>
                        <Space size={4}>
                            <Text strong>District</Text>
                            <ColumnFilterPopover
                                title="District"
                                options={districtOptions}
                                selected={districtFilter}
                                onChange={setDistrictFilter}
                            />
                        </Space>
                    </Col>
                    <Col>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {districtFilter.length === 0 ? 'All' : districtFilter.join(', ')}
                        </Text>
                    </Col>
                    <Col>
                        <Space size={4}>
                            <Text strong>Barangay</Text>
                            <ColumnFilterPopover
                                title="Barangay"
                                options={barangayOptions}
                                selected={barangayFilter}
                                onChange={setBarangayFilter}
                            />
                        </Space>
                    </Col>
                    <Col>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {barangayFilter.length === 0
                                ? 'All'
                                : barangayOptions.filter((b) => barangayFilter.includes(b.value)).map((b) => b.label).join(', ')}
                        </Text>
                    </Col>
                    {hasActiveFilters && (
                        <Col>
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                onClick={clearAllFilters}
                                style={{ paddingLeft: 0 }}
                            >
                                Clear All
                            </Button>
                        </Col>
                    )}
                    {loading && <Col><Spin size="small" /></Col>}
                </Row>
                {(statusFilter.length > 0 || genderFilter.length > 0 || ageFilter.length > 0 || districtFilter.length > 0 || barangayFilter.length > 0 || minAgeFilter !== null || maxAgeFilter !== null) && (
                    <Row style={{ marginTop: 10 }}>
                        <Col>
                            <Space size={[4, 4]} wrap>
                                {statusFilter.filter((s) => s !== 'all').map((s) => (
                                    <Tag key={`status-${s}`} closable onClose={() => setStatusFilter((prev) => prev.filter((v) => v !== s))} color="blue">
                                        Status: {STATUS_OPTIONS.find((o) => o.value === s)?.label || s}
                                    </Tag>
                                ))}
                                {genderFilter.map((id) => (
                                    <Tag key={`gender-${id}`} closable onClose={() => setGenderFilter((prev) => prev.filter((v) => v !== id))} color="magenta">
                                        Gender: {(apiData?.genders || []).find((g) => g.id === id)?.name || id}
                                    </Tag>
                                ))}
                                {ageFilter.map((key) => (
                                    <Tag key={`age-${key}`} closable onClose={() => setAgeFilter((prev) => prev.filter((v) => v !== key))} color="cyan">
                                        Age: {AGE_OPTIONS.find((o) => o.value === key)?.label || key}
                                    </Tag>
                                ))}
                                {districtFilter.map((d) => (
                                    <Tag key={`district-${d}`} closable onClose={() => setDistrictFilter((prev) => prev.filter((v) => v !== d))} color="orange">
                                        District: {d}
                                    </Tag>
                                ))}
                                {barangayFilter.map((id) => (
                                    <Tag key={`barangay-${id}`} closable onClose={() => setBarangayFilter((prev) => prev.filter((v) => v !== id))} color="green">
                                        Barangay: {barangayOptions.find((b) => b.value === id)?.label || id}
                                    </Tag>
                                ))}
                                {minAgeFilter !== null && (
                                    <Tag key="min-age" closable onClose={() => setMinAgeFilter(null)} color="geekblue">
                                        Min Age: {minAgeFilter}
                                    </Tag>
                                )}
                                {maxAgeFilter !== null && (
                                    <Tag key="max-age" closable onClose={() => setMaxAgeFilter(null)} color="geekblue">
                                        Max Age: {maxAgeFilter}
                                    </Tag>
                                )}
                            </Space>
                        </Col>
                    </Row>
                )}
            </Card>

            {/* Summary Stats */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}>
                    <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
                        <Statistic
                            title="Matched Seniors"
                            value={summaryStats.filtered || 0}
                            suffix={summaryStats.filtered !== summaryStats.total ? `/ ${summaryStats.total || 0}` : ''}
                            valueStyle={{ color: '#1a1a2e', fontSize: 22 }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
                        <Statistic
                            title="Barangays with Data"
                            value={summaryStats.barangaysWithData || 0}
                            suffix={`/ ${apiData?.distribution?.length || 0}`}
                            valueStyle={{ color: '#2e7d32', fontSize: 22 }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
                        <Statistic
                            title="Highest Count"
                            value={summaryStats.max || 0}
                            valueStyle={{ color: '#e53935', fontSize: 22 }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
                        <Statistic
                            title="Top Barangay"
                            value={summaryStats.topBarangay?.name || '—'}
                            valueStyle={{ fontSize: 16, color: '#1565c0' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Map */}
            <Card
                bodyStyle={{ padding: 0, borderRadius: 8, overflow: 'hidden' }}
                style={{ borderRadius: 8 }}
            >
                <div style={{ height: 'calc(100vh - 340px)', minHeight: 400, position: 'relative' }}>
                    <MapContainer
                        center={[6.9214, 122.0790]}
                        zoom={12}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {geo && (
                            <GeoJSON
                                key={geoJsonKey}
                                data={geo}
                                style={getStyle}
                                onEachFeature={onEachFeature}
                                ref={geoJsonRef}
                            />
                        )}
                        {geo && <FitBounds geoData={geo} />}
                        <Legend max={maxValue} filterLabel={filterLabel} />
                    </MapContainer>
                </div>
            </Card>

            {/* Custom tooltip CSS */}
            <style>{`
                .heatmap-tooltip {
                    background: rgba(255,255,255,0.95) !important;
                    border: 1px solid #ddd !important;
                    border-radius: 6px !important;
                    padding: 6px 10px !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
                    font-size: 12px !important;
                }
                .heatmap-tooltip::before {
                    border-top-color: #ddd !important;
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 8px !important;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
                }
                .leaflet-popup-content {
                    margin: 12px 14px !important;
                }
            `}</style>
        </div>
    );
};

export default Heatmap;
