<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code - OSCA Senior Portal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" max-width="520" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);">
                    
                    {{-- Institutional Header --}}
                    <tr>
                        <td style="padding: 32px 40px; background-color: #124429; border-bottom: 4px solid #b45309;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <div style="color: #ffffff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Zamboanga City</div>
                                        <div style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">OSCA Senior Citizen Portal</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Body Content --}}
                    <tr>
                        <td style="padding: 40px; background-color: #ffffff;">
                            <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 700;">Account Verification</h2>
                            
                            <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">
                                Hello, <span style="color: #1e293b; font-weight: 600;">{{ $seniorName }}</span>.
                            </p>
                            
                            <p style="margin: 0 0 32px; color: #475569; font-size: 15px; line-height: 1.6;">
                                An access request was made for your Senior Citizen Information System account. Please use the following one-time password (OTP) to proceed:
                            </p>

                            {{-- High Contrast OTP Box --}}
                            <div style="margin: 0 0 32px; padding: 32px; background-color: #f1f5f9; border-radius: 8px; text-align: center;">
                                <div style="margin-bottom: 8px; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">Your Verification Code</div>
                                <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 700; color: #124429; letter-spacing: 8px; line-height: 1;">
                                    {{ $otp }}
                                </div>
                                <div style="margin-top: 16px; color: #b45309; font-size: 13px; font-weight: 500;">
                                    Expires in {{ $expiryMinutes }} minutes
                                </div>
                            </div>

                            <p style="margin: 0 0 32px; color: #64748b; font-size: 13px; line-height: 1.5;">
                                For your security, this code was generated specifically for your session. If you did not initiate this request, no further action is required; however, we recommend ensuring your account credentials remain private.
                            </p>

                            {{-- Footer/Legal Info --}}
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Security Notice</p>
                                        <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                                            This is an automated system notification. OSCA Zamboanga City personnel will never ask for your verification code via phone, email, or social media. 
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Bottom Footer --}}
                    <tr>
                        <td style="padding: 32px 40px; background-color: #f8fafc; text-align: center; border-top: 1px solid #f1f5f9;">
                            <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600;">Office of Senior Citizens Affairs</p>
                            <p style="margin: 0; color: #94a3b8; font-size: 11px;">City Government of Zamboanga, Philippines</p>
                            <p style="margin: 12px 0 0; color: #cbd5e1; font-size: 10px;">
                                &copy; {{ date('Y') }} SCIS. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
