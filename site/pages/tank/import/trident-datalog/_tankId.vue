<template>
  <v-container fluid>
    <v-row>
      <v-col cols="auto">
        <v-card
          v-if="tank"
          elevation="6"
          width="375px"
        >
          <v-card-title>Import Trident data</v-card-title>
          <v-card-text>
            <p>
              If you have a Trident, you can import alkalinity, calcium and magnesium measurements using this wizard.
            </p>
            <p class="error--text">
              <strong>You must be on the same network as your Trident and it is not recommended that you do this on your phone; use a computer instead.</strong>
            </p>
          </v-card-text>
          <v-stepper v-model="step" vertical flat>
            <v-stepper-step
              :complete="step > 1"
              step="1"
            >
              Find the IP address and port
            </v-stepper-step>
            <v-stepper-content step="1">
              <v-container>
                <v-row>
                  <v-col cols="12">
                    <p>If you already know the IP address and port of your Trident, enter them below.</p>
                    <p>
                      Otherwise, go to <a href="https://apexfusion.com/login" target="_blank">Fusion</a>,
                      sign in and select your tank. Click on the house icon and then select "Network" to view your network settings.
                      Find the "IP Address" and "Port" and enter them below.
                    </p>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col cols="8">
                    <v-text-field
                      v-model="address"
                      label="IP Address"
                      :rules="[validateAddress]"
                      outlined
                      dense
                    />
                  </v-col>
                  <v-col cols="4">
                    <v-text-field
                      v-model="port"
                      label="Port"
                      :rules="[validatePort]"
                      outlined
                      dense
                    />
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-btn
                      small
                      color="secondary"
                      @click="cancel"
                    >
                      Cancel
                    </v-btn>
                    <v-btn
                      small
                      color="primary"
                      :disabled="!canGoToStep2"
                      @click="step++"
                    >
                      Continue
                    </v-btn>
                  </v-col>
                </v-row>
              </v-container>
            </v-stepper-content>
            <v-stepper-step
              :complete="step > 2"
              step="2"
            >
              Download the data
            </v-stepper-step>
            <v-stepper-content step="2">
              <v-container>
                <v-row>
                  <v-col cols="12">
                    <p>
                      Now, click on <a :href="downloadLink" target="_blank">this link</a> to open a new tab.
                      This will start downloading the data from your Trident.
                      <strong>It could take a minute, so be patient.</strong>
                    </p>
                    <p>
                      Once the data is displayed in the new tab, select "Save as..." to save it as a file on your computer. Make sure it ends with ".xml".
                    </p>
                    <p>
                      When the file is saved, click the field below to select it.
                    </p>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col cols="12">
                    <v-file-input
                      v-model="file"
                      accept="application/xml"
                      label="File"
                      outlined
                      prepend-icon=""
                      hide-details
                    />
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-btn
                      small
                      color="secondary"
                      @click="cancel"
                    >
                      Cancel
                    </v-btn>
                    <v-btn
                      small
                      color="primary"
                      :disabled="!file"
                      @click="step++"
                    >
                      Continue
                    </v-btn>
                  </v-col>
                </v-row>
              </v-container>
            </v-stepper-content>
            <v-stepper-step
              :complete="step > 3"
              step="3"
            >
              Import it
            </v-stepper-step>
            <v-stepper-content step="3">
              <v-container>
                <v-row>
                  <v-col cols="12">
                    <p>
                      Now, click the "import" button below to import the data. This could take a few seconds.
                    </p>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-btn
                      small
                      color="secondary"
                      @click="cancel"
                    >
                      Cancel
                    </v-btn>
                    <v-btn
                      small
                      color="primary"
                      :loading="importing"
                      @click="importIt"
                    >
                      Import
                    </v-btn>
                  </v-col>
                </v-row>
              </v-container>
            </v-stepper-content>
            <v-stepper-step
              step="4"
            >
              Finished
            </v-stepper-step>
            <v-stepper-content step="4">
              <v-container>
                <v-row>
                  <v-col cols="12">
                    <div v-if="result.failed">
                      <p class="error--text">
                        There was a problem importing the data.
                      </p>
                    </div>
                    <div v-else>
                      <p>
                        The data was imported. {{ result.imported }} entries were imported,
                        {{ result.existing }} entries already existed and {{ result.invalid }} were invalid.
                      </p>
                    </div>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-btn
                      small
                      color="secondary"
                      @click="step=1"
                    >
                      Start over
                    </v-btn>
                    <v-btn
                      small
                      color="primary"
                      @click="cancel"
                    >
                      Finish
                    </v-btn>
                  </v-col>
                </v-row>
              </v-container>
            </v-stepper-content>
          </v-stepper>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import format from 'date-fns/format'
export default {
  async fetch () {
    const tankId = this.$route.params.tankId
    const url = `/api/tank/${tankId}`
    const { tank } = await this.$axios.$get(url)
    this.tank = tank
  },
  data () {
    return {
      tank: undefined,
      step: 1,
      address: undefined,
      port: '80',
      file: undefined,
      importing: false,
      result: {}
    }
  },
  computed: {
    canGoToStep2 () {
      return this.validateAddress() === true && this.validatePort() === true
    },

    downloadLink () {
      // http://<the IP address>:<the port>/cgi-bin/datalog.xml?sdate=220214&days=5
      const sdate = format(new Date(), 'yyMMdd')
      return `http://${this.address}:${this.port}/cgi-bin/datalog.xml?sdate=${sdate}`
    }
  },
  methods: {
    validateAddress () {
      const rx = /^\d+\.\d+\.\d+\.\d+$/
      if (!this.address) {
        return 'This is required'
      }
      if (!rx.test(this.address)) {
        return 'Invalid address'
      }
      return true
    },

    validatePort () {
      if (!this.port) {
        return 'This is required'
      }
      const value = parseInt(this.port, 10)
      if (isNaN(value) || value <= 0) {
        return 'Invalid port'
      }
      return true
    },

    cancel () {
      this.$router.go(-1)
    },

    async importIt () {
      this.importing = true
      const url = '/api/tank/import'
      const formData = new FormData()
      formData.set('tankId', this.tank.tankId)
      formData.set('source', 'trident-datalog')
      formData.set('data', this.file)
      this.result = await this.$axios.$post(url, formData)
      this.importing = false
      this.step++
    }
  }
}
</script>
