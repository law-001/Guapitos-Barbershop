import { supabase } from './supabase'
import { dateFull, timeLabel, durLabel, peso, barberById } from '../helpers'

// Fire the booking-confirmation email via the `booking-confirm` Edge Function.
// Formatting lives here (reusing helpers.js) so the function stays a dumb
// templater. Fire-and-forget: a failed email must never block the booking, so
// callers don't await this — it logs and swallows its own errors.
//
// `booking` is an app (camelCase) booking object as built in BookingView.
// `ref` is the GB-XXXXX reference shown on the confirmation screen.
export async function sendBookingConfirmation(booking, ref) {
  if (!booking?.email) return // no address on file → nothing to send

  const barber = barberById(booking.barber)
  const payLabel = booking.pay === 'online' ? 'Paid online' : 'Pay at shop'

  const payload = {
    to: booking.email,
    customerEmail: booking.email,   // put in the action links so we can re-auth the right account
    bookingId: booking.id,
    ref: ref || '',
    customer: booking.customer || '',
    service: booking.service || '',
    dateLabel: dateFull(booking.date),
    timeLabel: timeLabel(booking.start),
    durLabel: durLabel(booking.dur),
    barberName: barber ? barber.name : 'First available',
    payLabel,
    priceLabel: peso(booking.price),
    notes: booking.notes || '',
  }

  try {
    const { error } = await supabase.functions.invoke('booking-confirm', { body: payload })
    if (error) console.error('booking-confirm email failed.', error)
  } catch (err) {
    console.error('booking-confirm email failed.', err)
  }
}
