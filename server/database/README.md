
# Database Schemas

Each directory here contains a list of SQL files that upgrade the schema from one version to the next. Once a version of the database is deployed, all changes must be made by upgrading it.

The current version of the database is stored in `PRAGMA user_version` and it has to be updated accordingly.

## Adding a new upgrade script

 1. Stop the server if it is running.
 2. Make a **backup copy** of the existing database.
 3. Create the new file, it has to be named `v<the new version number>.sql`. The version number has to be one higher than the last.
 5. Inside the transaction started in the file, you need to set `PRAGMA user_version=<the new version number>;` so that the server knows the database is the right version.
 1. Read about the correct way to make database changes [here](https://sqlite.org/lang_altertable.html) in the 'Making Other Kinds Of Table Schema Changes' section and craft the changes accordingly.
 2. When you're done, go into the source code that opens the database and change the requested version number to the new one.
 3. Now, start the server and pay attention to the log statements. It should open the database, realize that you're asking for a new version and run your script to upgraded it.
 4. If something goes wrong, use the backup copy of the database that you made (keeping a copy) and start over.
