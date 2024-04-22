import { Generic }  from '@run-morph/models';
import { Retrieve, Resource, ResourceRef, Metadata, Error }  from '@run-morph/sdk';

// Define metadata for the HubSpot deal model
const metadata:Metadata<Generic.Contact> = {
	model: Generic.Contact,
	scopes: []
};


export default new Retrieve( async (runtime, { id }) => { 
	
	// Call the HubSpotAPI GET a deal 
	const response = await runtime.proxy({
		method: 'GET',
		path: `/sobjects/Contact/${id}`,
		params: {
			fields: 'Id, FirstName, LastName, Email, Phone, CreatedDate, LastModifiedDate' 
		}
	});

	// Handle errors from the API response
	if(response.status === 'error'){
        switch (response.category){
            default:
                throw new Error(Error.Type.UNKNOWN_ERROR, response.message);
        }
    }

	// Map resource for the response
	const resource = mapResource(response) 

	// Return the resources and the next cursor for pagination
	return resource

}, metadata );


// Helper function to map HubSpot deal to HubSpot Crm.Opportunty resource
function mapResource(sf_contact){
	return new Resource({ 
		id: sf_contact.Id.substring(0, 15),
		data: {
			first_name: sf_contact.FirstName,
			last_name: sf_contact.LastName,
			email: sf_contact.Email,
			phone: sf_contact.Phone
		},
        remote_data: sf_contact,
        created_at: new Date(sf_contact.CreatedDate).toISOString(),
        updated_at: new Date(sf_contact.LastModifiedDate).toISOString()
		}, Generic.Contact)
}