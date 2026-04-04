# Dojoh.dev

## Project structure

TODO: @Leandroepk

## Kumite (Game) logic

Two users are going to compete each other in a codding game, couple things are going to happened:

### Matchmaking

- User A and B will search for a game, and the ranking system will pair them together, the matchmaking system will try to pair users with similar ranking, but if it can't find a match within X seconds, it will pair them with the closest ranking possible.
- Once the match is found, an event will be sent to the server to create the `game_session`
- The game session will be created with the following data:
  - `id`: unique identifier for the game session
  - `players`: array of player objects, each player object contains:
    - `id`: unique identifier for the player
    - `username`: username of the player
    - `ranking`: ranking of the player
  - `status`: status of the game session, can be `waiting`, `playing`, or `finished`
  - `created_at`: timestamp of when the game session was created
  - `updated_at`: timestamp of when the game session was last updated

### Game start

- Once the game session is created, a notification will be sent to both players, telling that the game is about to start, and the game session will be updated to `playing`
- The game will start with a random coding problem retrieve from out database, the problem will be the same for both players, and they will have to solve it in a limited time, let's say 30 minutes.
- **Other retrictions could be applied to the game**, like not allowing players to use internet, leaving the editor, or copy-pasting code from other sources, hardware restrictions (like execution time, memory usage, etc), and more.
- Two actions will be possible during the game:
  - `test_solution`: players can test their solution against a set of predefined test cases, and the server will return the result of the test (like `passed`, `failed`, etc)
  - `submit_solution`: players can submit their solution to the problem, and the server will evaluate it, and update the game session with the result of the evaluation (like `accepted`, `wrong answer`, `time limit exceeded`, etc). Once you submit your solution, you can't test it anymore, and you can't submit it again, and the game will reduce the time to finished for the other player so they will need to hurry up and submit their solution before the time runs out.

### During the game

- The player will have 3 panels:
  - Problem panel: where the problem statement will be displayed, along with the input and output format, and the constraints.
  - Editor panel: where the player will write their solution, and where they can test and submit their solution.
  - Test runner & submision panel: where the player can see the result of their tests and submissions, and where they can see the notifications from the other player actions.
- Some events will be emitted during the game, for example:
  - `player_ragequit`: when a player quits the game, the other player will be declared the winner
  - `solution_tested`: when a player tests their solution, will appear a notificatiton in the other player screen, telling them that their opponent is testing their solution, and the result of the test.
  - `solution_submitted`: when a player submits their solution, will appear a notificatiton in the other player screen, telling them that their opponent is submitting their solution, and advicing them to hurry up and submit their solution before the time runs out.

### Game end

- A game can end in three ways:
  - A player submits a solution, and the other player doesn't submit a solution before the time runs out, in this case the player who submitted the correct solution will be declared the winner.
  - A player submits a solution, and the other player also submits a solution before the time runs out, in this case the player who submitted fulfils the problem requirements will be declared the winner, if both players submitted a solution that fulfills the problem requirements.
  - A player quit in the middle of the game, in this case the other player will be declared the winner.
- The game session will be updated to `finished`, and the result will be stored in the database, along with the time it took for each player to submit their solution, and the ranking of each player before and after the game.
- In case of a draw, the tie-breaker system will be applied for the session, cheking whatever it needs to understand who is the winner, for example, the player who submitted their solution first, etc...

### Test runner & submission evaluation

- The test runner will be responsible for running the player's solution against a set of predefined test cases, and returning the result of the test (like `passed`, `failed`, etc)
- Under the hood, the test runner will create a docker container (with a preinstalled image for the target language) for each player, once it receives a request to test or submit a solution, it will run the player's solution inside the container, and it will compare the output of the solution with the expected output for each test case, and it will return the result of the test (like `passed`, `failed`, etc)
- There is not limit to the number of test cases, **but in the future** could penalize players for testing too much, or a new gamemode where there could be no tests, and players will have to submit their solution without testing it, and they will only know if their solution is correct or not after submitting it.

## Match flow

1. User A and B search for a game for a specific language and difficulty, and the matchmaking system pairs them together.
2. An event is sent to the server to create the game session.
3. The game session is created with the initial data, and a notification is sent to both players, telling that the game is about to start.
4. The game starts with a random coding problem, and both players will have a limit amount of time to solve it.
5. They must write their solution in the editor panel, and they can test their solution against a set of predefined test cases, and submit their solution to be evaluated (a submission will lock the player from testing or submitting again, and will reduce the time to finished for the other player).
6. The game will finished updating both players elo ranking, etc...

## Ranking System

TODO: @Leandroepk
