<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    public string $seniorName;
    public int $expiryMinutes;

    // Create a new message instance.
    public function __construct(string $otp, string $seniorName, int $expiryMinutes = 10)
    {
        $this->otp = $otp;
        $this->seniorName = $seniorName;
        $this->expiryMinutes = $expiryMinutes;
    }

    // Get the message envelope.
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your OSCA Senior Portal Verification Code',
        );
    }

    // Get the message content definition.
    public function content(): Content
    {
        return new Content(
            html: 'emails.otp',
        );
    }

    // Get the attachments for the message.
    public function attachments(): array
    {
        return [];
    }
}
