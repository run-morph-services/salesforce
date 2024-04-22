import { Generic }  from '@run-morph/models';
import { Retrieve, Resource, ResourceRef, Metadata, Error }  from '@run-morph/sdk';

// Define metadata for the HubSpot deal model
const metadata:Metadata<Generic.User> = {
	model: Generic.User,
	scopes: []
};


export default new Retrieve( async (runtime, { id }) => { 
	
	// Call the HubSpotAPI GET a deal 
	const response = await runtime.proxy({
		method: 'GET',
		path: `/sobjects/User/${id}`,
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
function mapResource(sf_user){
	return new Resource({ 
		id: sf_user.Id.substring(0, 15),
		data: {
			first_name: sf_user.FirstName,
			last_name: sf_user.LastName,
			email: sf_user.Email
		},
        remote_data: sf_user,
        created_at: new Date(sf_user.CreatedDate).toISOString(),
        updated_at: new Date(sf_user.LastModifiedDate).toISOString()
		}, Generic.User)
}