#!/bin/bash

# Variables
TEST_USER="testuser"
TEST_PASSWORD="testpassword"
CLI_PATH="./dist/sprout" # Path to your CLI project

# Step 1: Create a test user
echo "Creating test user..."
sudo sysadminctl -addUser $TEST_USER -password $TEST_PASSWORD