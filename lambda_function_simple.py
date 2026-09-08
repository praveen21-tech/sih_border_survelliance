import json
import os
import logging
import pickle
import boto3
import pandas as pd
from groq import Groq
from sklearn.preprocessing import LabelEncoder, StandardScaler
import time

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')

# Global variables (loaded once)
model = None
label_encoders = None
scaler = None
dataset = None

def load_model():
    """Load ML model from S3"""
    global model
    try:
        if not model:
            # Download model from S3
            obj = s3_client.get_object(
                Bucket=os.getenv('S3_BUCKET'),
                Key='ml_model.pkl'
            )
            model = pickle.loads(obj['Body'].read())
            logger.info("ML model loaded successfully")
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        raise

def load_preprocessors():
    """Load label encoders and scaler from S3"""
    global label_encoders, scaler
    try:
        if not label_encoders:
            # Download encoders from S3
            obj = s3_client.get_object(
                Bucket=os.getenv('S3_BUCKET'),
                Key='preprocessors.pkl'
            )
            label_encoders, scaler = pickle.loads(obj['Body'].read())
            logger.info("Preprocessors loaded successfully")
    except Exception as e:
        logger.error(f"Error loading preprocessors: {str(e)}")
        raise

def load_dataset():
    """Load dataset from S3"""
    global dataset
    try:
        if not dataset:
            # Download dataset from S3
            obj = s3_client.get_object(
                Bucket=os.getenv('S3_BUCKET'),
                Key='crop_yield_extended_dataset.csv'
            )
            dataset = pd.read_csv(obj['Body'])
            logger.info("Dataset loaded successfully")
    except Exception as e:
        logger.error(f"Error loading dataset: {str(e)}")
        raise

def initialize():
    """Initialize all required components"""
    try:
        load_model()
        load_preprocessors()
        load_dataset()
        logger.info("Lambda initialization complete")
    except Exception as e:
        logger.error(f"Initialization failed: {str(e)}")
        raise

def store_prediction_s3(input_data, prediction):
    """Store prediction data in S3 as JSON file (optional)"""
    try:
        prediction_data = {
            'input_data': input_data,
            'prediction': prediction,
            'timestamp': time.time(),
            'date': time.strftime('%Y-%m-%d')
        }
        
        # Store in S3 with date-based folder structure
        s3_client.put_object(
            Bucket=os.getenv('S3_BUCKET'),
            Key=f'predictions/{prediction_data["date"]}/{int(time.time())}.json',
            Body=json.dumps(prediction_data),
            ContentType='application/json'
        )
        
        logger.info("Prediction stored in S3")
        
    except Exception as e:
        logger.error(f"Error storing prediction in S3: {str(e)}")
        # Don't fail the request if S3 write fails

def lambda_handler(event, context):
    """Main Lambda handler"""
    try:
        # Initialize on first invocation
        if not all([model, label_encoders, scaler, dataset]):
            initialize()
        
        # Get request details
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
        # Route to appropriate handler
        if http_method == 'POST' and path == '/predict':
            return handle_predict(event)
        elif http_method == 'POST' and path == '/chatbot':
            return handle_chatbot(event)
        elif http_method == 'POST' and path == '/fertilizer-schedule':
            return handle_fertilizer_schedule(event)
        elif http_method == 'POST' and path == '/seasonal':
            return handle_seasonal_planning(event)
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Endpoint not found'})
            }
            
    except Exception as e:
        logger.error(f"Lambda handler error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }

def handle_predict(event):
    """Handle yield prediction requests"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        required_fields = ['crop_type', 'soil_type', 'area', 'rainfall_mm', 
                          'temperature_c', 'soil_moisture_percent', 
                          'pesticide_usage_kg', 'fertilizer_amount_kg', 'year']
        
        for field in required_fields:
            if field not in body:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({'error': f'Missing required field: {field}'})
                }
        
        # Prepare input data
        input_data = pd.DataFrame([{
            'State': 'Unknown',
            'District': 'Unknown',
            'Crop': body['crop_type'],
            'Season': 'Unknown',
            'Soil_Type': body['soil_type'],
            'Fertilizer_Type': 'Unknown',
            'Area': body['area'],
            'Rainfall_mm': body['rainfall_mm'],
            'Temperature_C': body['temperature_c'],
            'Soil_Moisture_%': body['soil_moisture_percent'],
            'Pesticide_Usage_kg': body['pesticide_usage_kg'],
            'Fertilizer_Amount_kg': body['fertilizer_amount_kg'],
            'Year': body['year']
        }])
        
        # Encode categorical variables
        for column in ['State', 'District', 'Crop', 'Season', 'Soil_Type', 'Fertilizer_Type']:
            if column in label_encoders:
                input_data[column] = label_encoders[column].transform(input_data[column])
        
        # Scale features
        feature_columns = ['State', 'District', 'Crop', 'Season', 'Soil_Type', 
                          'Fertilizer_Type', 'Area', 'Rainfall_mm', 'Temperature_C', 
                          'Soil_Moisture_%', 'Pesticide_Usage_kg', 'Fertilizer_Amount_kg', 'Year']
        
        input_scaled = scaler.transform(input_data[feature_columns])
        
        # Make prediction
        prediction = model.predict(input_scaled)[0]
        
        # Store in S3 (optional)
        store_prediction_s3(body, prediction)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'predicted_yield': float(prediction),
                'crop_type': body['crop_type'],
                'input_data': body
            })
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': 'Prediction failed'})
        }

def handle_chatbot(event):
    """Handle chatbot requests"""
    try:
        body = json.loads(event.get('body', '{}'))
        message = body.get('message', '').strip()
        
        if not message:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'No message provided'})
            }
        
        # Chatbot prompt
        system_prompt = """You are an expert agricultural AI assistant. You can help farmers with:

1. Crop management and cultivation practices
2. Disease identification and treatment
3. Pest control methods
4. Irrigation and water management
5. Fertilizer recommendations and timing
6. Soil health and improvement
7. Weather impact on farming
8. Sustainable farming practices
9. Market information and trends
10. Equipment and machinery advice

CRITICAL FORMATTING RULES:
- DO NOT use markdown formatting like **bold**, *italic*, or ### headers
- DO NOT use tables with | characters or --- separators
- DO NOT use hashtags or asterisks for formatting
- DO NOT use bullet points with * or -
- Write as plain conversational text only
- Use simple paragraphs and numbered lists
- NO MARKDOWN FORMATTING AT ALL

RESPONSE STYLE:
- Keep answers short and simple like ChatGPT
- Use conversational, friendly tone
- Focus on most important points
- Avoid overly technical details
- Give practical, actionable advice
- Limit responses to 2-3 paragraphs maximum
- Use simple language farmers can understand

Be helpful, accurate, and provide practical advice. If you're not sure about something, say so honestly."""

        user_prompt = f"Farmer asks: {message}\n\nPlease provide a short, simple answer in plain text without any markdown formatting. Keep it conversational and brief like ChatGPT."

        # Call Groq API
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Service unavailable'})
            }
        
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.4,
            max_tokens=500
        )
        
        if response.choices and len(response.choices) > 0:
            bot_response = response.choices[0].message.content
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'response': bot_response})
            }
        else:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Failed to get response'})
            }
            
    except Exception as e:
        logger.error(f"Chatbot error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': 'Chatbot service failed'})
        }

def handle_fertilizer_schedule(event):
    """Handle fertilizer schedule requests"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        if 'growth_months' in body:
            required_fields = ['crop_type', 'growth_months', 'rainfall', 'soil_moisture']
        else:
            required_fields = ['crop_type', 'soil_moisture', 'temperature', 'rainfall', 'previous_yield']
            
        for field in required_fields:
            if field not in body:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({'error': f'Missing required field: {field}'})
                }
        
        # Fertilizer schedule prompt
        system_prompt = """You are an expert agricultural advisor specializing in fertilizer recommendations. 

Create a practical, easy-to-understand fertilizer schedule for farmers. Focus on:

1. Clear, actionable recommendations
2. Simple language (avoid technical jargon)
3. Specific products and application rates
4. Practical timing based on crop growth stages
5. Safety considerations

CRITICAL FORMATTING RULES:
- DO NOT use markdown headers like ### or ---
- DO NOT use tables with | characters
- DO NOT use hashtags or special formatting
- Write as plain conversational text only
- Use simple paragraphs and bullet points
- NO MARKDOWN FORMATTING AT ALL

Format your response as plain text:
- Brief introduction about the crop's needs
- Clear fertilizer recommendations with specific products and rates
- Practical application tips
- Safety warnings if needed

Keep it conversational and farmer-friendly, not like a technical manual."""

        # Build user prompt based on form type
        if 'growth_months' in body:
            user_prompt = f"""Generate a farmer-friendly fertilizer schedule for {body['crop_type']} with these conditions:

Current Situation:
- Crop: {body['crop_type']}
- Growth Stage: {body['growth_months']} months
- Rainfall: {body['rainfall']}mm
- Soil Moisture: {body['soil_moisture']}%

Please provide:
1. A brief assessment of current conditions
2. Specific fertilizer recommendations with exact products and rates
3. Application timing and methods based on growth stage
4. Practical tips for success
5. Any safety considerations

Make it sound like advice from an experienced agricultural advisor, not a technical manual."""
        else:
            user_prompt = f"""Generate a farmer-friendly fertilizer schedule for {body['crop_type']} with these conditions:

Current Situation:
- Crop: {body['crop_type']}
- Soil Moisture: {body['soil_moisture']}%
- Temperature: {body['temperature']}°C
- Rainfall: {body['rainfall']}mm
- Previous Yield: {body['previous_yield']} tons/hectare

Please provide:
1. A brief assessment of current conditions
2. Specific fertilizer recommendations with exact products and rates
3. Application timing and methods
4. Practical tips for success
5. Any safety considerations

Make it sound like advice from an experienced agricultural advisor, not a technical manual."""

        # Call Groq API
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Service unavailable'})
            }
        
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.4,
            max_tokens=800
        )
        
        if response.choices and len(response.choices) > 0:
            schedule = response.choices[0].message.content
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'schedule': schedule})
            }
        else:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Failed to generate fertilizer schedule'})
            }
            
    except Exception as e:
        logger.error(f"Fertilizer schedule error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': 'Fertilizer schedule service failed'})
        }

def handle_seasonal_planning(event):
    """Handle seasonal planning requests"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        required_fields = ['crop_type', 'region', 'planting_date']
        for field in required_fields:
            if field not in body:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({'error': f'Missing required field: {field}'})
                }
        
        # Seasonal planning prompt
        system_prompt = """You are an expert agricultural advisor specializing in seasonal planning and crop management.

Create a practical, easy-to-understand seasonal plan for farmers. Focus on:

1. Clear, actionable recommendations
2. Simple language (avoid technical jargon)
3. Specific timing and activities
4. Weather considerations
5. Risk management

CRITICAL FORMATTING RULES:
- DO NOT use markdown headers like ### or ---
- DO NOT use tables with | characters
- DO NOT use hashtags or special formatting
- Write as plain conversational text only
- Use simple paragraphs and bullet points
- NO MARKDOWN FORMATTING AT ALL

Format your response as plain text:
- Brief overview of the season
- Key activities and timing
- Weather considerations
- Risk management tips
- Success factors

Keep it conversational and farmer-friendly, not like a technical manual."""

        user_prompt = f"""Generate a farmer-friendly seasonal plan for {body['crop_type']} in {body['region']} with planting date {body['planting_date']}.

Please provide:
1. Seasonal overview and key considerations
2. Important activities and their timing
3. Weather patterns to watch for
4. Risk management strategies
5. Tips for successful harvest

Make it sound like advice from an experienced agricultural consultant, not a technical manual."""

        # Call Groq API
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Service unavailable'})
            }
        
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.4,
            max_tokens=800
        )
        
        if response.choices and len(response.choices) > 0:
            seasonal_plan = response.choices[0].message.content
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'seasonal_plan': seasonal_plan})
            }
        else:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Failed to generate seasonal plan'})
            }
            
    except Exception as e:
        logger.error(f"Seasonal planning error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': 'Seasonal planning service failed'})
        }
