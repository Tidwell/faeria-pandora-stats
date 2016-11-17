#Faeria-Pandora-Stat-Ripper

Scrapes the faeria pandora stats and persists them to mongo for further analysis.

This only populates a mongo database.  There is no way to view the data in any pretty way, you need to query mongo to do anything with it.

##Install

```bash
 $ git clone https://github.com/Tidwell/faeria-pandora-stats.git
 $ cd faeria-pandora-stats
 $ npm install
```

##Config

* Update ``config.json`` with your mongo connection string and collection
* By default it runs every 10 minutes, you can change it in ``config.json`` for development.

##Run
```bash
  $ npm start
```

You can view the logs at ``http://localhost:8961/``

##Deploy
```bash
  $ forever node index.json
```