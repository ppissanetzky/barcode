<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card elevation="6" height="600">
          <div id="chart_div" class="fill-height fill-width" />
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import fromUnixTime from 'date-fns/fromUnixTime'
import { classToHex } from 'vuetify/lib/util/colorUtils'
import colors from 'vuetify/lib/util/colors'
function convertColor (css) {
  // This is because 'classToHex' is broken for colors that include
  // a hyphen such as 'deep-purple'. We change that to 'deepPurple'
  //
  // We also change -5 to -3 to darken the color a bit, because the
  // lighter colors don't show up well in a white chart
  const upper = css
    .replace(/(-\D)/, match => match.substr(1).toUpperCase())
    .replace('-5', '-2')
  return classToHex(upper, colors, {})
}
export default {
  async fetch () {
  },

  data () {
    return {
      entries: []
    }
  },

  mounted () {
    const script = document.createElement('script')
    script.setAttribute('src', 'https://www.gstatic.com/charts/loader.js')
    script.onload = () => {
      const promiseForCharts = new Promise((resolve) => {
        window.google.charts.load('current', {
          packages: ['corechart', 'line']
        })
        window.google.charts.setOnLoadCallback(resolve)
      })
      const promiseForData = Promise.resolve().then(async () => {
        const tankId = 1
        const url = `/api/tank/parameters/${tankId}`
        const { entries } = await this.$axios.$get(url)
        for (const entry of entries) {
          entry.date = fromUnixTime(entry.time)
        }
        return entries
      })
      Promise.all([promiseForCharts, promiseForData]).then(([, entries]) => {
        drawChart(entries)
      })
    }
    document.head.appendChild(script)

    // ------------------------------------------------------------------------

    function drawChart (entries) {
      const entryTypes = [
        {
          name: 'Alk',
          entryTypeId: 6,
          isTracked: true,
          color: 'deep-purple lighten-5'
        },
        // {
        //   name: 'Ca',
        //   entryTypeId: 7,
        //   isTracked: true
        // },
        {
          name: 'Good',
          entryTypeId: 2,
          color: 'green lighten-5'
        },
        {
          name: 'Bad',
          entryTypeId: 3,
          color: 'red lighten-5'
        }
      ]

      const data = new window.google.visualization.DataTable()
      data.addColumn('datetime', 'Time')

      const map = new Map()
      const series = []
      let seriesIndex = 0
      for (const type of entryTypes) {
        const index = data.getNumberOfColumns()
        map.set(type.entryTypeId, { ...type, index })
        if (type.isTracked) {
          data.addColumn('number', type.name)
          series[seriesIndex++] = {
            color: convertColor(type.color)
          }
        } else {
          data.addColumn('number', type.name)
          data.addColumn({ type: 'string', role: 'annotation' })
          data.addColumn({ type: 'string', role: 'tooltip' })
          series[seriesIndex++] = {
            color: convertColor(type.color),
            lineWidth: 0,
            pointSize: 9,
            pointShape: 'diamond'
          }
        }
      }

      const columns = data.getNumberOfColumns()
      let min = Infinity
      let max = -Infinity

      for (const entry of entries) {
        const info = map.get(entry.type)
        if (info) {
          if (info.isTracked) {
            const row = new Array(columns)
            row[0] = entry.date
            row[info.index] = entry.value
            data.addRow(row)
            min = Math.min(min, entry.value)
            max = Math.max(max, entry.value)
          }
        }
      }

      for (const entry of entries) {
        const info = map.get(entry.type)
        if (info) {
          if (!info.isTracked) {
            const row = new Array(columns)
            row[0] = entry.date
            row[info.index + 0] = min
            row[info.index + 1] = info.name
            row[info.index + 2] = `${entry.date.toLocaleDateString()}\n${entry.text}`
            data.addRow(row)
          }
        }
      }

      const options = {
        curveType: 'function',
        pointSize: 3,
        series,
        explorer: {
          axis: 'horizontal',
          keepInBounds: true
        },
        hAxis: {
          viewWindow: {
            max: new Date()
          },
          gridlines: {
            // Get rid of the vertical grid lines
            color: 'none',
            units: {
              days: {
                format: ['MMM d']
              },
              hours: {
                format: ['HH:mm', 'ha']
              }
            }
          }
        }
      }

      function resize () {
        const chart = new window.google.visualization.LineChart(document.getElementById('chart_div'))
        chart.draw(data, options)
      }

      resize()

      window.onresize = resize
    }
  }
}
</script>
