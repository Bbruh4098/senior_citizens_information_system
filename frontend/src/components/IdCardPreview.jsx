import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Space } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';

// Standard PVC ID card dimensions: 85.6mm x 54mm (CR80)
// Aspect ratio: 85.6/54 ≈ 1.585

const CARD_WIDTH = 428; // px (85.6mm at ~127 DPI for screen preview)
const CARD_HEIGHT = 270; // px (54mm at ~127 DPI for screen preview)

const IdCardPreview = ({ cardData, onPrint, showPrintButton = true }) => {
    const cardRef = useRef(null);

    const handlePrint = () => {
        if (cardRef.current) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>OSCA ID Card - ${cardData?.osca_id || 'Print'}</title>
                    <style>
                        @page {
                            size: 85.6mm 54mm;
                            margin: 0;
                        }
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body {
                            margin: 0;
                            padding: 0;
                            font-family: 'Segoe UI', Arial, sans-serif;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            background: #fff;
                        }
                        .print-sheet {
                            width: 85.6mm;
                            margin: 0 auto;
                        }
                        @media print {
                            html, body {
                                width: 85.6mm;
                                margin: 0;
                                padding: 0;
                                overflow: hidden;
                            }
                            .print-card {
                                width: 85.6mm !important;
                                height: 54mm !important;
                                margin: 0 !important;
                                border: none !important;
                                border-radius: 0 !important;
                                box-shadow: none !important;
                                overflow: hidden !important;
                                break-inside: avoid;
                            }
                            .print-card + .print-card {
                                page-break-before: always;
                                break-before: page;
                            }
                            .page-break {
                                margin-top: 0 !important;
                                page-break-before: always;
                                break-before: page;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-sheet">${cardRef.current.innerHTML}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
        if (onPrint) onPrint();
    };

    if (!cardData) {
        return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No card data available</div>;
    }

    // Build address for display
    const displayAddress = cardData.address || '';

    return (
        <div>
            <div ref={cardRef}>
                {/* ===== FRONT SIDE ===== */}
                <div className="print-card id-card-front" style={styles.card}>
                    {/* Gold left sidebar */}
                    <div style={styles.leftSidebar}>
                        <span style={styles.sidebarText}>SENIOR CITIZEN ID</span>
                    </div>

                    {/* Main content area */}
                    <div style={styles.mainContent}>
                        {/* Header with seal */}
                        <div style={styles.header}>
                            <img
                                src="/images/zc_seal.jpg"
                                alt="City Seal"
                                style={styles.seal}
                                crossOrigin="anonymous"
                            />
                            <div style={styles.headerText}>
                                <div style={styles.headerLine1}>Republic of the Philippines</div>
                                <div style={styles.headerLine2}>CITY MAYOR'S OFFICE</div>
                                <div style={styles.headerLine3}>CITY GOVERNMENT OF ZAMBOANGA</div>
                                <div style={styles.headerLine3}>OFFICE FOR SENIOR CITIZEN'S AFFAIRS</div>
                                <div style={styles.headerLine1}>Zamboanga City</div>
                            </div>
                        </div>

                        {/* Body: Photo + Fields */}
                        <div style={styles.body}>
                            {/* Photo section */}
                            <div style={styles.photoColumn}>
                                <div style={styles.photoBox}>
                                    {cardData.photo_url ? (
                                        <img
                                            src={cardData.photo_url}
                                            alt="Senior Photo"
                                            style={styles.photo}
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div style={styles.photoPlaceholder}>
                                            <span>2×2</span>
                                            <span>PHOTO</span>
                                        </div>
                                    )}
                                </div>
                                <div style={styles.signatureBox}>
                                    <div style={styles.signatureLine}></div>
                                    <span style={styles.signatureLabel}>Signature/Thumbmark</span>
                                </div>
                            </div>

                            {/* Fields section */}
                            <div style={styles.fieldsColumn}>
                                <div style={styles.fieldRow}>
                                    <span style={styles.fieldLabel}>LAST NAME:</span>
                                    <span style={styles.fieldValue}>{cardData.last_name || ''} {cardData.extension || ''}</span>
                                </div>
                                <div style={styles.fieldRow}>
                                    <span style={styles.fieldLabel}>FIRST NAME:</span>
                                    <span style={styles.fieldValue}>{cardData.first_name || ''}</span>
                                </div>
                                <div style={styles.fieldRow}>
                                    <span style={styles.fieldLabel}>MIDDLE NAME:</span>
                                    <span style={styles.fieldValue}>{cardData.middle_name || ''}</span>
                                </div>
                                <div style={styles.fieldRow}>
                                    <span style={styles.fieldLabel}>ADDRESS:</span>
                                    <span style={{ ...styles.fieldValue, fontSize: '7.5px' }}>{displayAddress}</span>
                                </div>
                                <div style={styles.fieldRow}>
                                    <span style={styles.fieldLabel}>DATE OF BIRTH:</span>
                                    <span style={styles.fieldValue}>{cardData.birthdate || ''}</span>
                                </div>
                                <div style={styles.fieldRow}>
                                    <span style={styles.fieldLabel}>GENDER:</span>
                                    <span style={styles.fieldValue}>{cardData.gender || ''}</span>
                                </div>
                                <div style={styles.fieldRow}>
                                    <span style={styles.fieldLabel}>DATE ISSUED:</span>
                                    <span style={styles.fieldValue}>{cardData.issue_date || ''}</span>
                                </div>
                            </div>
                        </div>

                        {/* Control Number */}
                        <div style={styles.controlNumber}>
                            <span style={styles.controlLabel}>CONTROL NO:</span>
                            <span style={styles.controlValue}>{cardData.osca_id || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* ===== BACK SIDE ===== */}
                <div className="print-card id-card-back page-break" style={{ ...styles.card, marginTop: '16px' }}>
                    {/* Main back content */}
                    <div style={styles.backContent}>
                        {/* Title */}
                        <div style={styles.backTitle}>
                            BENEFITS AND PRIVILEGES UNDER REPUBLIC ACT NO. 9994
                        </div>

                        {/* Benefits list */}
                        <div style={styles.benefitsList}>
                            <ul style={styles.benefitsUl}>
                                <li>Free Medical/Dental, diagnostic and laboratory service in all government facilities</li>
                                <li>20% discount for Medicines</li>
                                <li>20% discount in hotels, restaurants, recreation centers</li>
                                <li>20% discount in theaters, cinema houses and concert halls</li>
                                <li>20% discount in medical, dental services, diagnostic and laboratory fees in private facilities</li>
                                <li>20% discount in fare for domestic air, sea travel and public land transportation</li>
                                <li>5% discount in basic necessities and prime commodities</li>
                                <li>12% VAT-exemption on the purchase of goods and services which are entitled to the 20% discount</li>
                                <li>5% discount for the monthly utilization of water and electricity, provided that the water and electricity meter bases under the name of the senior citizens.</li>
                            </ul>
                        </div>

                        {/* Bottom section: QR + Signatories + Penalty */}
                        <div style={styles.backBottom}>
                            {/* QR Code */}
                            <div style={styles.qrSection}>
                                <QRCodeSVG
                                    value={cardData.qr_data || JSON.stringify({ osca_id: cardData.osca_id })}
                                    size={55}
                                    level="M"
                                />
                            </div>

                            {/* Signatories */}
                            <div style={styles.signatories}>
                                <div style={styles.signatory}>
                                    <strong>ROBERTO F. ARSENA</strong>
                                    <span>OSCA Head</span>
                                </div>
                                <div style={{ ...styles.signatory, marginTop: '4px' }}>
                                    <strong>HON. KHYMER ADAMI T. OLASO</strong>
                                    <span>City Mayor</span>
                                </div>
                            </div>

                            {/* Penalty notice */}
                            <div style={styles.penaltyNotice}>
                                <em>
                                    Persons and Corporations violating R.A. 9994 shall be penalized.
                                    Only for the exclusive use of Senior Citizens, abuse of privileges is punishable by law.
                                </em>
                            </div>
                        </div>
                    </div>

                    {/* Gold right sidebar */}
                    <div style={styles.rightSidebar}>
                        <span style={styles.sidebarTextRight}>THIS CARD IS NON-TRANSFERABLE</span>
                    </div>
                </div>
            </div>

            {showPrintButton && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Space>
                        <Button
                            type="primary"
                            icon={<PrinterOutlined />}
                            onClick={handlePrint}
                            size="large"
                        >
                            Print ID Card
                        </Button>
                    </Space>
                </div>
            )}
        </div>
    );
};

// ===== Styles =====
const goldColor = '#c8a951';
const goldBg = 'linear-gradient(180deg, #d4a843 0%, #b8922e 100%)';
const cardBg = '#fffef5';

const styles = {
    card: {
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        display: 'flex',
        flexDirection: 'row',
        fontFamily: "'Segoe UI', 'Arial Narrow', Arial, sans-serif",
        border: '1px solid #ccc',
        borderRadius: '4px',
        overflow: 'hidden',
        backgroundColor: cardBg,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    },

    // Left sidebar (FRONT)
    leftSidebar: {
        width: '28px',
        background: goldBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sidebarText: {
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '11px',
        letterSpacing: '2px',
        textAlign: 'center',
        whiteSpace: 'nowrap',
    },

    // Right sidebar (BACK)
    rightSidebar: {
        width: '28px',
        background: goldBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sidebarTextRight: {
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '8px',
        letterSpacing: '1.5px',
        textAlign: 'center',
        whiteSpace: 'nowrap',
    },

    // Main content (FRONT)
    mainContent: {
        flex: 1,
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
    },

    // Header
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '4px',
        paddingBottom: '3px',
        borderBottom: `1px solid ${goldColor}`,
    },
    seal: {
        width: '32px',
        height: '32px',
        objectFit: 'contain',
        borderRadius: '50%',
    },
    headerText: {
        flex: 1,
        textAlign: 'center',
        lineHeight: 1.15,
    },
    headerLine1: {
        fontSize: '7px',
        color: '#333',
    },
    headerLine2: {
        fontSize: '8.5px',
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    headerLine3: {
        fontSize: '7px',
        fontWeight: 'bold',
        color: '#333',
    },

    // Body
    body: {
        display: 'flex',
        gap: '8px',
        flex: 1,
    },

    // Photo column
    photoColumn: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '80px',
        flexShrink: 0,
    },
    photoBox: {
        width: '72px',
        height: '80px',
        border: '1px solid #999',
        backgroundColor: '#f5f5f5',
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    photoPlaceholder: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: '9px',
        gap: '2px',
    },
    signatureBox: {
        width: '72px',
        marginTop: '3px',
        textAlign: 'center',
    },
    signatureLine: {
        borderBottom: '1px solid #333',
        width: '100%',
        height: '16px',
    },
    signatureLabel: {
        fontSize: '5.5px',
        color: '#666',
        fontStyle: 'italic',
    },

    // Fields column
    fieldsColumn: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '1px',
    },
    fieldRow: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
        borderBottom: '0.5px dotted #ccc',
        paddingBottom: '1px',
    },
    fieldLabel: {
        fontSize: '7px',
        fontWeight: 'bold',
        color: '#333',
        whiteSpace: 'nowrap',
        minWidth: '70px',
    },
    fieldValue: {
        fontSize: '8.5px',
        color: '#111',
        fontWeight: '600',
    },

    // Control number
    controlNumber: {
        position: 'absolute',
        bottom: '4px',
        right: '6px',
        textAlign: 'right',
        backgroundColor: goldColor,
        padding: '2px 6px',
        borderRadius: '2px',
    },
    controlLabel: {
        fontSize: '6.5px',
        color: '#fff',
        fontWeight: 'bold',
        marginRight: '4px',
    },
    controlValue: {
        fontSize: '8px',
        color: '#fff',
        fontWeight: 'bold',
        letterSpacing: '0.5px',
    },

    // ===== BACK SIDE =====
    backContent: {
        flex: 1,
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
    },
    backTitle: {
        fontSize: '8px',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '4px',
        color: '#1a1a1a',
        borderBottom: `1px solid ${goldColor}`,
        paddingBottom: '2px',
    },
    benefitsList: {
        flex: 1,
        overflow: 'hidden',
    },
    benefitsUl: {
        fontSize: '6px',
        lineHeight: 1.35,
        paddingLeft: '12px',
        margin: 0,
        color: '#222',
    },
    backBottom: {
        display: 'flex',
        gap: '6px',
        alignItems: 'flex-end',
        marginTop: '3px',
        paddingTop: '3px',
        borderTop: `0.5px solid ${goldColor}`,
    },
    qrSection: {
        flexShrink: 0,
    },
    signatories: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    signatory: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: '6.5px',
        lineHeight: 1.2,
        color: '#222',
    },
    penaltyNotice: {
        fontSize: '5px',
        color: '#555',
        lineHeight: 1.2,
        maxWidth: '100px',
    },
};

export default IdCardPreview;
