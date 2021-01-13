<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>Add a new item</h1>
      </v-col>
    </v-row>

    <!-- The card with the form -->

    <v-row>
      <v-col cols="auto">
        <v-card>
          <!-- Watches over the form and disables the button if validation fails -->
          <validation-observer ref="observer" v-slot="{ invalid }">
            <v-form
              id="add-new-item"
              @submit.prevent="submitPrevent"
              @submit="submit"
            >
              <!-- Required information -->
              <v-container>
                <v-row>
                  <v-col>Required information</v-col>
                </v-row>

                <!-- Name -->

                <v-row>
                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="required"
                      name="name"
                    >
                      <v-text-field
                        id="name"
                        v-model="name"
                        label="Name"
                        name="name"
                        hint="Common name"
                        persistent-hint
                        :error-messages="errors"
                        required
                        outlined
                      />
                    </validation-provider>
                  </v-col>

                  <!-- Type -->

                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="required"
                      name="type"
                    >
                      <v-select
                        id="type"
                        v-model="type"
                        label="Type"
                        name="type"
                        :items="['LPS','SPS','Softie','Other']"
                        :error-messages="errors"
                        required
                        outlined
                      />
                    </validation-provider>
                  </v-col>
                </v-row>

                <v-row>
                  <!-- Date acquired -->

                  <v-col>
                    <v-menu
                      ref="menu"
                      v-model="menu"
                      :close-on-content-click="false"
                      :return-value.sync="dateAcquired"
                      transition="scale-transition"
                      offset-y
                      min-width="290px"
                    >
                      <template v-slot:activator="{ on, attrs }">
                        <validation-provider
                          v-slot="{ errors }"
                          rules="required|length:10"
                          name="date acquired"
                        >
                          <v-text-field
                            id="dateAcquired"
                            v-model="dateAcquired"
                            label="Date acquired"
                            v-bind="attrs"
                            name="dateAcquired"
                            hint="The date you got it"
                            persistent-hint
                            :error-messages="errors"
                            readonly
                            required
                            outlined
                            v-on="on"
                          />
                        </validation-provider>
                      </template>
                      <v-date-picker
                        v-model="dateAcquired"
                        :max="today"
                        no-title
                        scrollable
                      >
                        <v-spacer />
                        <v-btn
                          text
                          color="primary"
                          @click="menu = false"
                        >
                          Cancel
                        </v-btn>
                        <v-btn
                          text
                          color="primary"
                          @click="$refs.menu.save(dateAcquired)"
                        >
                          OK
                        </v-btn>
                      </v-date-picker>
                    </v-menu>
                  </v-col>

                  <!-- Frags available -->

                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="required|integer|min_value:0"
                      name="frags available"
                    >
                      <v-text-field
                        id="fragsAvailable"
                        v-model="fragsAvailable"
                        label="Frags available"
                        name="fragsAvailable"
                        hint="The number of frags available now"
                        persistent-hint
                        type="number"
                        min="0"
                        :error-messages="errors"
                        required
                        outlined
                      />
                    </validation-provider>
                  </v-col>
                </v-row>

                <!-- Picture -->

                <v-row>
                  <v-col>
                    <validation-provider
                      v-slot="{ errors, validate }"
                      rules="required|image"
                      name="picture"
                    >
                      <v-file-input
                        id="picture"
                        v-model="picture"
                        required
                        outlined
                        label="Picture"
                        name="picture"
                        accept="image/*"
                        prepend-icon=""
                        :error-messages="errors"
                        @change="validate"
                      />
                    </validation-provider>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col>Additional details - optional</v-col>
                </v-row>

                <!-- Size -->
                <v-row>
                  <v-col>
                    <v-text-field
                      id="size"
                      v-model="size"
                      label="Size"
                      name="size"
                      hint="Polyps, heads or inches"
                      persistent-hint
                      outlined
                    />
                  </v-col>
                </v-row>

                <!-- Scientific name -->

                <v-row>
                  <v-col>
                    <v-text-field
                      id="scientificName"
                      v-model="scientificName"
                      outlined
                      label="Scientific name"
                      name="scientificName"
                    />
                  </v-col>
                </v-row>

                <!-- Notes -->

                <v-row>
                  <v-col>
                    <v-textarea
                      id="notes"
                      v-model="notes"
                      outlined
                      label="Notes"
                      name="notes"
                      auto-grow
                      rows="1"
                    />
                  </v-col>
                </v-row>

                <!-- Light and flow -->

                <v-row>
                  <v-col>
                    <v-select
                      id="light"
                      v-model="light"
                      outlined
                      label="Light"
                      name="light"
                      :items="['Low','Medium','High']"
                    />
                  </v-col>
                  <v-col>
                    <v-select
                      id="flow"
                      v-model="flow"
                      outlined
                      label="Flow"
                      name="flow"
                      :items="['Low','Medium','High']"
                    />
                  </v-col>
                </v-row>

                <!-- Hardiness and growth rate -->

                <v-row>
                  <v-col>
                    <v-select
                      id="hardiness"
                      v-model="hardiness"
                      outlined
                      label="Hardiness"
                      name="hardiness"
                      :items="['Sensitive','Normal','Hardy']"
                    />
                  </v-col>
                  <v-col>
                    <v-select
                      id="growthRate"
                      v-model="growthRate"
                      outlined
                      label="Growth rate"
                      name="growthRate"
                      :items="['Slow','Normal','Fast']"
                    />
                  </v-col>
                </v-row>

                <!-- Source -->

                <v-row>
                  <v-col>
                    <v-divider />
                  </v-col>
                </v-row>

                <v-row>
                  <v-col>Source details - optional &amp; private</v-col>
                </v-row>

                <!-- Source type and name -->

                <v-row>
                  <v-col>
                    <v-select
                      id="sourceType"
                      v-model="sourceType"
                      outlined
                      label="Source type"
                      name="sourceType"
                      :items="['Member','LFS','Online', 'Other']"
                      hint="Where you got it"
                      persistent-hint
                    />
                  </v-col>
                  <v-col>
                    <v-text-field
                      id="source"
                      v-model="source"
                      outlined
                      label="Source name"
                      name="source"
                    />
                  </v-col>
                </v-row>

                <!-- Cost -->

                <v-row>
                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="double"
                      name="cost"
                    >
                      <v-text-field
                        id="cost"
                        v-model="cost"
                        outlined
                        label="Cost"
                        name="cost"
                        hint="How much you paid for it"
                        persistent-hint
                        :error-messages="errors"
                      />
                    </validation-provider>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col>
                    <v-btn
                      color="primary"
                      type="submit"
                      :disabled="invalid"
                    >
                      Add it now
                    </v-btn>
                  </v-col>
                </v-row>
              </v-container>
            </v-form>
          </validation-observer>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog we show after the item is added -->

    <v-row justify="center">
      <v-dialog
        v-model="dialog"
        persistent
        max-width="290"
      >
        <v-card>
          <v-card-title class="headline">
            Item added!
          </v-card-title>
          <v-card-text v-text="`${name} was added!`" />
          <v-card-actions>
            <v-spacer />
            <v-btn
              text
              to="/"
            >
              OK
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-row>
  </v-container>
</template>
<script>
// This imports the validation observer, provider and all the
// rules with their messages
import { ValidationObserver, ValidationProvider } from 'vee-validate/dist/vee-validate.full.esm'
import { formatISO, parseISO } from 'date-fns'

// Today's date time converted to local and stripped of its time
const today = formatISO(new Date(), { representation: 'date' })

export default {
  components: {
    ValidationObserver,
    ValidationProvider
  },
  data () {
    return {
      name: undefined,
      type: undefined,
      dateAcquired: today,
      fragsAvailable: 0,
      picture: undefined,
      size: undefined,
      scientificName: undefined,
      notes: undefined,
      light: 'Medium',
      flow: 'Medium',
      hardiness: 'Normal',
      growthRate: 'Normal',
      sourceType: 'Other',
      source: undefined,
      cost: '0.00',

      menu: false,
      dialog: false,
      today
    }
  },
  methods: {
    submitPrevent () {
      this.$refs.observer.validate()
    },

    async submit () {
      const formData = new FormData()
      const keys = [
        'name',
        'type',
        // 'dateAcquired', - added below
        'fragsAvailable',
        'picture',
        'size',
        'scientificName',
        'notes',
        'light',
        'flow',
        'hardiness',
        'growthRate',
        'sourceType',
        'source',
        'cost'
      ]

      keys.forEach((key) => {
        const value = this.$data[key]
        if (typeof value !== 'undefined') {
          formData.set(key, value)
        }
      })

      // Convert the local date (only) to a full date/time with TZ information
      formData.set('dateAcquired', formatISO(parseISO(this.$data.dateAcquired)))

      /* const { fragId } = */ await this.$axios.$post('/bc/api/dbtc/add-new-item', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((fragId) => {
        this.$data.dialog = true
        return fragId
      })
    }
  }
}
</script>
