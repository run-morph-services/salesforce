import { Generic }  from '@run-morph/models';
import { Retrieve, Resource, ResourceRef, Metadata, Error }  from '@run-morph/sdk';

// Define metadata for the HubSpot deal model
const metadata:Metadata<Generic.Company> = {
	model: Generic.Company,
	scopes: []
};


export default new Retrieve( async (runtime, { id }) => { 
	
	// Call the HubSpotAPI GET a deal 
	const response = await runtime.proxy({
		method: 'GET',
		path: `/sobjects/Account/${id}`,
		params: {
			fields: ' Id, Name, CreatedDate, LastModifiedDate' 
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
function mapResource(sf_account){
	return new Resource({ 
		id: sf_account.Id.substring(0, 15),
		data: {
			name: sf_account.Name			
		},
        remote_data: sf_account,
        created_at: new Date(sf_account.CreatedDate).toISOString(),
        updated_at: new Date(sf_account.LastModifiedDate).toISOString()
		}, Generic.Company)
}