#!/bin/bash

# Variables
TEST_USER="testuser"
TEST_PASSWORD="testpassword"
CLI_PATH="./dist/sprout" # Path to your CLI project

# Step 1: Create a test user
echo "Creating test user..."
sudo sysadminctl -addUser $TEST_USER -password $TEST_PASSWORD

# Step 2: Copy CLI project to the test user's home directory
echo "Copying CLI project to test user's home directory..."
sudo cp -R $CLI_PATH /Users/$TEST_USER/

# Step 3: Switch to the test user and test the CLI
echo "Switching to test user and testing CLI..."
sudo su - $TEST_USER -c "
  cd ~/sprout
  bun install # Install dependencies
  bun run build # Build the CLI
  ./dist/sprout --help # Test the CLI
"

# Step 4: Delete the test user
echo "Deleting test user..."
sudo sysadminctl -deleteUser $TEST_USER

echo "Test environment cleaned up."