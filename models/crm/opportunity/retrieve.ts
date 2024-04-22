import { Crm, Generic }  from '@run-morph/models';
import { Retrieve, Resource, ResourceRef, Metadata, Error }  from '@run-morph/sdk';

// Define metadata for the HubSpot deal model
const metadata:Metadata<Crm.Opportunity> = {
	model: Crm.Opportunity,
	scopes: []
};


export default new Retrieve( async (runtime, { id }) => { 
	
	// Call the HubSpotAPI GET a deal 
	const response = await runtime.proxy({
		method: 'GET',
		path: `/sobjects/Opportunity/${id}`,
		params: {
			fields: 'Id, Name, Amount, StageName, AccountId, ContactId, OwnerId, CloseDate, CreatedDate, LastModifiedDate' 
		}
	});

	// Handle errors from the API response
	if(response.status === 'error'){
        switch (response.category){
            default:
                throw new Error(Error.Type.UNKNOWN_ERROR, response.message);
        }
    }

	const sf_oppo_stages = await runtime.proxy({
		method: 'GET',
		path: `/query`,
		params: {
			q: `SELECT Id, MasterLabel,ForecastCategoryName,IsActive,DefaultProbability FROM OpportunityStage` 
		}
	});

	// Map resource for the response
	const resource = mapResource(response, sf_oppo_stages) 

	// Return the resources and the next cursor for pagination
	return resource

}, metadata );


// Helper function to map HubSpot deal to HubSpot Crm.Opportunty resource
function mapResource(sf_opportunity, sf_oppo_stages){
	const stage_id = sf_oppo_stages.records.filter((sf_stage) => sf_stage.MasterLabel === sf_opportunity.StageName)[0]?.Id.substring(0, 15) || null;
	return new Resource({ 
		id: sf_opportunity.Id.substring(0, 15),
		data: {
			name: sf_opportunity.Name,
			amount: sf_opportunity.Amount,
			currency: null,
			closed_at: sf_opportunity.CloseDate,
			pipeline: new ResourceRef({id: 'Opportunity'}, Crm.Pipeline),
			stage: stage_id ? new ResourceRef({id: stage_id}, Crm.Stage) : null,
			contacts: sf_opportunity.ContactId ? [new ResourceRef({ id: sf_opportunity.ContactId.substring(0, 15) }, Generic.Contact)] : [],
			companies:sf_opportunity.AccountId? [new ResourceRef({ id: sf_opportunity.AccountId.substring(0, 15) }, Generic.Company)] : [],
			owner: sf_opportunity.OwnerId ? new ResourceRef({ id: sf_opportunity.OwnerId.substring(0, 15) }, Generic.User) : null
		},
        remote_data: sf_opportunity,
        created_at: new Date(sf_opportunity.CreatedDate).toISOString(),
        updated_at: new Date(sf_opportunity.LastModifiedDate).toISOString()
		}, Crm.Opportunity)
}