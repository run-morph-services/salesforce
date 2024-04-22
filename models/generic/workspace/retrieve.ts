import { Generic }  from '@run-morph/models';
import { Retrieve, Resource, ResourceRef, Metadata, Error }  from '@run-morph/sdk';

// Define metadata for the HubSpot deal model
const metadata:Metadata<Generic.Workspace> = {
	model: Generic.Workspace,
	scopes: []
};


export default new Retrieve( async (runtime, { id }) => { 
	
	// Call the HubSpotAPI GET a deal 
	const response = await runtime.proxy({
		method: 'GET',
		path: `/query`,
		params: {
			q: 'SELECT Id,Name,CreatedDate,LastModifiedDate FROM Organization' 
		}
	});

	// Handle errors from the API response
	if(response.status === 'error' || !response?.records[0]){
        switch (response.category){
            default:
                throw new Error(Error.Type.UNKNOWN_ERROR, response.message);
        }
    }

	// Map resource for the response
	const resource = mapResource(response?.records[0]) 

	// Return the resources and the next cursor for pagination
	return resource

}, metadata );


// Helper function to map HubSpot deal to HubSpot Crm.Opportunty resource
function mapResource(sf_org){
	return new Resource({ 
		id: sf_org.Id.substring(0, 15),
		data: {
			name: sf_org.Name
		},
        remote_data: sf_org,
        created_at: new Date(sf_org.CreatedDate).toISOString(),
        updated_at: new Date(sf_org.LastModifiedDate).toISOString()
		}, Generic.Workspace)
}