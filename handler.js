const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

module.exports.registerUser = async (event) => {
  const body = JSON.parse(event.body);
  const { name, email, password } = body;

  const params = {
    TableName: process.env.USERS_TABLE,
    Item: {
      email,
      name,
      password, 
    },
  };

  try {
    await dynamoDb.put(params).promise();
    return {
      statusCode: 201,
      body: JSON.stringify({ message: "User registered successfully" }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error registering user" }),
    };
  }
};

module.exports.loginUser = async (event) => {
  const body = JSON.parse(event.body);
  const { email, password } = body;

  const params = {
    TableName: process.env.USERS_TABLE,
    Key: { email },
  };

  try {
    const result = await dynamoDb.get(params).promise();
    if (!result.Item || result.Item.password !== password) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid credentials" }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Login successful" }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error during login" }),
    };
  }
};

module.exports.addGoal = async (event) => {
  const body = JSON.parse(event.body);
  const { userId, title, description, priority, deadline } = body;

  if (!userId || !title || !priority || !deadline) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing required fields" }),
    };
  }

  const goalId = uuidv4();

  const params = {
    TableName: process.env.GOALS_TABLE,
    Item: {
      goalId,
      userId,
      title,
      description,
      priority,
      deadline,
      createdAt: new Date().toISOString(),
    },
  };

  try {
    await dynamoDb.put(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Goal added successfully", goalId }),
    };
  } catch (err) {
    console.error("Goal add error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

module.exports.assignGoal = async (event) => {
    const userId = event.queryStringParameters?.userId;
  
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing userId" }),
      };
    }
  
    const params = {
      TableName: process.env.GOALS_TABLE,
      FilterExpression: "userId = :uid",
      ExpressionAttributeValues: {
        ":uid": userId,
      },
    };
  
    try {
      const result = await dynamoDb.scan(params).promise();
      const userGoals = result.Items;
  
      if (!userGoals || userGoals.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "No goals found for this user" }),
        };
      }
  
      const priorityOrder = { High: 1, Medium: 2, Low: 3 };
  
      // Sort goals by priority, then deadline
      userGoals.sort((a, b) => {
        const p1 = priorityOrder[a.priority] || 4;
        const p2 = priorityOrder[b.priority] || 4;
        if (p1 !== p2) return p1 - p2;
        return new Date(a.deadline) - new Date(b.deadline);
      });
  
      const assignedGoal = userGoals[0];
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Goal assigned successfully",
          assignedGoal,
        }),
      };
  
    } catch (err) {
      console.error("Assign goal error:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error assigning goal" }),
      };
    }
  };
  
