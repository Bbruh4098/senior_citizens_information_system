import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Segmented, Spin, Typography, Row, Col, Statistic, Alert, Tooltip as AntTooltip } from 'antd';
import { TeamOutlined, ManOutlined, WomanOutlined, HeartOutlined, HeatMapOutlined } from '@ant-design/icons';
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

// Filter options with labels and icons
const FILTER_OPTIONS = [
    { label: 'Total', value: 'total', icon: <TeamOutlined /> },
    { label: 'Male', value: 'male', icon: <ManOutlined /> },
    { label: 'Female', value: 'female', icon: <WomanOutlined /> },
    { label: '60-69', value: 'age_60_69' },
    { label: '70-79', value: 'age_70_79' },
    { label: '80-89', value: 'age_80_89' },
    { label: '90-99', value: 'age_90_99' },
    { label: '100+', value: 'centenarian', icon: <HeartOutlined /> },
];

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

// Legend component that sits inside the map
const Legend = ({ max, filter }) => {
    const map = useMap();
    const legendRef = useRef(null);

    useEffect(() => {
        if (!legendRef.current) return;
        const L = window.L || map._leaflet_id && window.L;
        if (!L) return;
        // Prevent map interaction when hovering over legend
        const el = legendRef.current;
        L.DomEvent.disableClickPropagation(el);
        L.DomEvent.disableScrollPropagation(el);
    }, [map]);

    const filterLabel = FILTER_OPTIONS.find(f => f.value === filter)?.label || 'Count';

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
                {filterLabel} Count
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

// Component to fit map bounds to GeoJSON
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
    const [activeFilter, setActiveFilter] = useState('total');
    const geoJsonRef = useRef(null);

    // Fetch both API data and GeoJSON
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [apiRes, geoRes] = await Promise.all([
                    dashboardApi.getHeatmapData(),
                    fetch('/data/zamboanga_barangays.json').then(r => r.json()),
                ]);
                setApiData(apiRes.data.data);
                setGeoData(geoRes);
            } catch (err) {
                console.error('Heatmap data fetch error:', err);
                setError(err.response?.data?.message || 'Failed to load heatmap data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Map DB barangay data to GeoJSON features by name
    const dataLookup = useMemo(() => {
        if (!apiData) return {};
        const lookup = {};
        apiData.distribution.forEach(brgy => {
            // Normalize: lowercase, trim
            const dbName = brgy.name.trim();
            const geoName = NAME_MAP[dbName] || dbName;
            lookup[geoName.toLowerCase()] = brgy;
        });
        return lookup;
    }, [apiData]);

    // Max value for current filter
    const maxValue = useMemo(() => {
        if (!apiData) return 0;
        return Math.max(...apiData.distribution.map(b => b[activeFilter] || 0), 1);
    }, [apiData, activeFilter]);

    // Summary stats for current filter
    const summaryStats = useMemo(() => {
        if (!apiData) return {};
        const dist = apiData.distribution;
        const filterVal = activeFilter;
        const total = dist.reduce((sum, b) => sum + (b[filterVal] || 0), 0);
        const withData = dist.filter(b => (b[filterVal] || 0) > 0).length;
        const max = Math.max(...dist.map(b => b[filterVal] || 0));
        const topBarangay = dist.find(b => (b[filterVal] || 0) === max);
        return { total, barangaysWithData: withData, max, topBarangay };
    }, [apiData, activeFilter]);

    // Style function for GeoJSON
    const getStyle = (feature) => {
        const name = (feature.properties.NAME_3 || feature.properties.NAME || '').toLowerCase();
        const data = dataLookup[name];
        const value = data ? (data[activeFilter] || 0) : 0;
        return {
            fillColor: getColor(value, maxValue),
            weight: 1.5,
            opacity: 1,
            color: '#ffffff',
            fillOpacity: 0.75,
        };
    };

    // Event handlers for each feature
    const onEachFeature = (feature, layer) => {
        const name = (feature.properties.NAME_3 || feature.properties.NAME || '');
        const data = dataLookup[name.toLowerCase()];

        // Tooltip on hover
        const label = FILTER_OPTIONS.find(f => f.value === activeFilter)?.label || 'Count';
        const count = data ? (data[activeFilter] || 0) : 0;
        layer.bindTooltip(
            `<div style="font-weight:600;margin-bottom:2px">${data?.name || name}</div>` +
            `<div>${label}: <strong>${count}</strong></div>`,
            { sticky: true, direction: 'top', className: 'heatmap-tooltip' }
        );

        // Popup on click with full breakdown
        if (data) {
            layer.bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#1a1a2e">${data.name}</div>
          <div style="color:#666;font-size:11px;margin-bottom:8px">${data.district}</div>
          <table style="width:100%;font-size:12px;border-collapse:collapse">
            <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">Total</td><td style="text-align:right;font-weight:600">${data.total}</td></tr>
            <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">Male</td><td style="text-align:right;font-weight:600">${data.male}</td></tr>
            <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">Female</td><td style="text-align:right;font-weight:600">${data.female}</td></tr>
            <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">Age 60-69</td><td style="text-align:right">${data.age_60_69}</td></tr>
            <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">Age 70-79</td><td style="text-align:right">${data.age_70_79}</td></tr>
            <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">Age 80-89</td><td style="text-align:right">${data.age_80_89}</td></tr>
            <tr style="border-bottom:1px solid #eee"><td style="padding:3px 0">Age 90-99</td><td style="text-align:right">${data.age_90_99}</td></tr>
            <tr><td style="padding:3px 0">Centenarian</td><td style="text-align:right;font-weight:600;color:#e53935">${data.centenarian}</td></tr>
          </table>
        </div>
      `);
        }

        // Highlight on hover
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

    // Force re-render GeoJSON when filter changes
    const geoJsonKey = useMemo(() => `${activeFilter}-${maxValue}`, [activeFilter, maxValue]);

    if (loading) {
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
                    Zamboanga City — click any barangay for detailed breakdown
                </Text>
            </div>

            {/* Filter Bar */}
            <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Text strong style={{ whiteSpace: 'nowrap' }}>Filter by:</Text>
                    <Segmented
                        options={FILTER_OPTIONS.map(f => ({
                            label: (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {f.icon} {f.label}
                                </span>
                            ),
                            value: f.value,
                        }))}
                        value={activeFilter}
                        onChange={setActiveFilter}
                        size="middle"
                    />
                </div>
            </Card>

            {/* Summary Stats */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}>
                    <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
                        <Statistic
                            title={`${FILTER_OPTIONS.find(f => f.value === activeFilter)?.label || ''} Seniors`}
                            value={summaryStats.total || 0}
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
                        {geoData && (
                            <GeoJSON
                                key={geoJsonKey}
                                data={geoData}
                                style={getStyle}
                                onEachFeature={onEachFeature}
                                ref={geoJsonRef}
                            />
                        )}
                        {geoData && <FitBounds geoData={geoData} />}
                        <Legend max={maxValue} filter={activeFilter} />
                    </MapContainer>
                </div>
            </Card>

            {/* Custom CSS for tooltips */}
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
