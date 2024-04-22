import { Crm, Generic }  from '@run-morph/models';
import { Retrieve, Resource, ResourceRef, Metadata, Error }  from '@run-morph/sdk';

// Define metadata for the HubSpot deal model
const metadata:Metadata<Crm.Stage> = {
	model: Crm.Stage,
	scopes: []
};


export default new Retrieve( async (runtime, { id }) => { 
	
	// Call the HubSpotAPI GET a deal 
	const response = await runtime.proxy({
		method: 'GET',
		path: `/query`,
		params: {
			q: `SELECT Id, MasterLabel,ForecastCategoryName,IsActive,DefaultProbability FROM OpportunityStage WHERE Id = '${id}'` 
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
function mapResource(sf_oppo_stages){
	const sf_stage = sf_oppo_stages.records[0];

	let stageType;
	if (sf_stage.ForecastCategoryName === 'Closed' || sf_stage.ForecastCategoryName === 'Omitted') {
		stageType = sf_stage.DefaultProbability === 100 ? 'WON' : 'LOST';
	} else if(sf_stage.ForecastCategoryName === 'Pipeline') {
		stageType = 'OPEN';
	}  else {
		stageType = 'UNKNOWN';
	}

	return new Resource<Crm.Stage>({id: sf_stage.Id.substring(0, 15), parents:{pipeline:'Opportunity'}, data:{ name: sf_stage.MasterLabel, type: stageType }, created_at: new Date().toISOString(), updated_at:new Date().toISOString(), remote_data: sf_stage},Crm.Stage);
}