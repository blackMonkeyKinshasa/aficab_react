 import { BookingType,Booking } from "@/constants/dataInterface";
import { apiFetch } from "./apiConfig";




 //methode GET

 export function getBookings(token?: string) {
  const endpoint = '/booking';
  return apiFetch(endpoint, token, {
    method: 'GET',
  });
}

export function getIDBooking(bookingType:BookingType,token?: string) {
  const endpoint = '/booking/generate-id?type='+bookingType;
  return apiFetch(endpoint, token, {
    method: 'GET',
  });
}

export function getbookingByID(id:string,token?: string) {
  const endpoint = '/booking/'+id;
  return apiFetch(endpoint, token, {
    method: 'GET',
  });
}​

//methode POST

export function createNewBooking( bookingData: Booking,token?: string,) {
    const endpoint = '/booking';
  return apiFetch(endpoint, token, {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

export function  clientCancelBooking( id : string,token?: string,) {
    const endpoint = `/booking/${id}/client-cancel`;
  return apiFetch(endpoint, token, {
    method: 'POST',
    body: JSON.stringify(
        {
    status: 'PENDING',
    clientId: '',
    reason: ''
  }
    ),
  });
}
