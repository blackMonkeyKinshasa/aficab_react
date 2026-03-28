import { apiFetch } from './apiConfig';

/*
Operations

get/activity
post/activity

Retrieve list of activities​Copy link
Fetches a list of activities based on optional search parameters.

Query Parameters
-----------------
action Type:string
userId Type:string
bookingId Type:string
organizationId Type:string
isRead Type:string
pageType:string

ex :

getActivity(token)
  .then((data) => console.log(data))
  .catch((err) => console.error(err));

*/
export function getActivity(token: string) {
  const endpoint = '/activity';
  return apiFetch(endpoint, token, {
    method: 'GET',
  });
}
